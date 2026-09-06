// IMPLEMENTS: docs/tech/04_city_simulation/system_3_police_memory.md
//             §Invariants canoniques (lossy per-precinct map; daily decay; softmax raid targeting; P5)
//             §États PrecinctMemory (suspicion_map 32×32 uint8; top_5_buildings; raid_temperature; last_raid_at)
//             §Update tick (Tick 1 ON_EVENT observation bump; Tick 2 daily decay; Tick 3 12h precinct review)
//             §NestJS — backend jeu (PoliceMemoryService — runObservationUpdate / runDailyDecayPass /
//                                    runPrecinctReviewTick / getTopTargets / getSuspicionMapSnapshot)
//             + cross_system_interactions.md §Ordre DAG canonique + §Table des events canoniques
//             -- session:2026-06-02 (Phase 1 Task 4) --
//             D2 R3b (2026-06-17): G31 declaration-ledger acceptor.
//             - Subscribes to BossMirrorRuleDeclared/BossMirrorRuleRetracted bus events → appends a
//               DeclarationEntry to the precinct_memory.declaration_ledger ring (per-precinct FIFO).
//             - Tick2 (runDailyDecay): decays declaration_ledger entries by half_life_boss_mirror_days;
//               fully-decayed (severity ≤ 0) entries beyond entry_retention_days are swept/retired.
//             - Tick3 (runPrecinctReview): adds G31 term to final_tile_score:
//               final_tile_score = patrol_observation_score + weight_vs_patrol × declaration_severity_sum.
//               GATED: term is only non-zero when declaration_severity_sum > 0.
//               ZERO-REGRESSION: a precinct with declaration_severity_sum = 0 scores byte-identical.
//             - Stale «no declaration_ledger column» comments updated (column exists since R3a migration 0052).
//
// `PoliceMemoryService` — System 3 (Asymmetric Police Memory). The EVENT-DRIVEN + MULTI-CADENCE persisted
// system. It owns the per-player `precinct_memory` (6 rows = bpd.precinct_count) and the lossy per-precinct
// `suspicion_map` (32×32 uint8 tile grid). It copies the SparseCitizens persisted-system template (repository
// + projection + controller + tunables) but with the System-3-specific shape: an event SUBSCRIBER (not a
// per-tick state mutation) for the belief accumulation, plus two maintenance passes (decay + review).
//
// THE 3 TICKS (system_3 §Update tick):
//   - Tick 1 — PER OBSERVATION (ON_EVENT, event-driven): subscribe to the CityEventBus. On a
//     FlowCellCongestedEvent or WhisperActivatedEvent for a block, bump the corresponding suspicion_map tile
//     of the precinct that OWNS that block's district. This is the LOSSY belief accumulation. The bump
//     mutates an IN-MEMORY working copy (the per-player buffers) synchronously (the bus emits sync); the
//     accumulation is PERSISTED by the MINUTE flush slot (a single batched UPDATE per dirty player per minute,
//     NOT per-event round-trips). Tick 1 is "immédiat" — the per-minute flush is its persistence cadence.
//   - Tick 2 — DECAY PASS (NIGHTLY, "chaque jour in-game"): every tile decays by
//     {{tunable:memory_decay_per_tile_per_day}} (scaled to the uint8 0..255 domain). Memory is ephemeral —
//     a long quiet span cools a precinct (the long-absence-cooling feature). Deterministic.
//   - Tick 3 — PRECINCT REVIEW (TWELVE_H, every {{tunable:precinct_review_tick_hours}}=12h): recompute
//     top_5_buildings from the hottest tiles with the softmax raid-target ordering ({{tunable:raid_target_temperature}}).
//     Persists top_5_buildings + a clamped raid_temperature. This is the data System 4 (Patrol Doctrine) READS
//     via getTopTargets() to enrich its raid targeting (the DAG dependency System 3 → System 4, Inv 6 read-only).
//     Deterministic (no RNG — see DETERMINISM).
//
// THE SYSTEM 3↔4 HANDOFF (T5 — System 4 Patrol Doctrine landed):
//   - System 3 NO LONGER emits cross-system events. In T4 this service was the documented STAND-IN producer of
//     RaidPlannedEvent / UndercoverDispatchedEvent ("until System 4 lands"). System 4 now OWNS that emission
//     (cross_system_interactions.md L116: "System 3 ne produit pas d'events cross-system"). The 12h review keeps
//     recomputing top_5_buildings (the targets System 4 reads) but emits NOTHING.
//   - System 3 GAINS two subscriptions on the CityEventBus:
//       · PatrolObservationEvent (System 4's 30-min patrol-observation channel) → bump the precinct suspicion
//         tile (a NEW suspicion SOURCE alongside FlowCellCongested/WhisperActivated).
//       · RaidPlannedEvent (System 4's 12h review raid) → POST-RAID memory update: stamp last_raid_at on the
//         precinct (cross_system_interactions.md L92/134: System 3 consommateur de RaidPlannedEvent post-raid).
//         This keeps last_raid_at System 3's OWN write (System 4 never mutates precinct_memory — Inv 6).
//   - System 3 EXPOSES getTopTargets(playerId, precinctId) (read-only) — the softmax-ordered top target blocks
//     System 4 clusters against. Read-only: System 4 must not mutate precinct_memory.
//
// CADENCE RECONCILIATION (the key design decision; the spec reviewer will scrutinize): the SCHEDULE shipped by
// T1 had POLICE_MEMORY only at ON_EVENT — the tick-synthesis table (composition/tick_schedule) UNDER-LISTED
// System 3's maintenance passes. But system_3 §Update tick Tick 2/Tick 3 DEFINE a daily decay + a 12h precinct
// review. So this task ADDS the slots System 3 genuinely needs to the canonical SCHEDULE (adding entries is
// legitimate — SCHEDULE is the canonical config; cite §Update tick Tick 2/Tick 3): MINUTE/5 (observation
// flush — persistence of the ON_EVENT accumulation), TWELVE_H/4 (precinct review), NIGHTLY/3 (decay). The new
// entries are placed AFTER the existing systems at those cadences (no existing slot removed/reordered): the
// 12h review runs LAST (after System 4's BPD review — the canonical RaidPlannedEvent owner once T6 lands — and
// System 6's MIS pull whose outcomes feed System 3); the nightly decay runs LAST (after cohesion + unconformity
// settle the day's belief). The no-op-placeholder seeding iterates SCHEDULE so the new slots got placeholders
// automatically (this service replaces them via registerSystem).
//
// PRECINCT ↔ DISTRICT MAPPING (design call, documented — mirrors T0's bank_side split): 6 precincts own 18
// districts → 3 districts per precinct, assigned by CONTIGUOUS district-id grouping: precinct p (1..6) owns
// districts {3(p-1)+1, 3(p-1)+2, 3(p-1)+3}. So precinct 1 ⊃ {1,2,3}, precinct 2 ⊃ {4,5,6}, …, precinct 6 ⊃
// {16,17,18}. Districts 1..18 are seeded contiguously by profile/bank (T0 geography seed), so contiguous
// district-id grouping yields geographically coherent precincts. Deterministic + total (every district maps
// to exactly one precinct) + the inverse is a simple ⌈district/3⌉.
//
// SCOPE — STATUS UPDATE (D2 R3b):
//   - The G31 declaration_ledger sub-mechanic — the second write channel (attributed declarations from 04c/04d
//     legal/forensic events) — was DEFERRED in Phase 1. The `precinct_memory` table gained the `declaration_ledger`
//     nullable JSONB column in D2 R3a (migration 0052). D2 R3b activates the subscription acceptor (boss_mirror
//     violation channel) + Tick2 decay + Tick3 G31 scoring. The 04d legal/forensic emitters (plea_record,
//     forensic_byproduct, lifestyle_audit, pact_dossier) are still DEFERRED — they will subscribe to the SAME
//     `appendDeclarationEntry` write hook when their emitter mechanics land.
//   - The full clerk-corruption ClerkState depth is DEFERRED — there is no lieutenant/clerk entity in Phase 1;
//     `corruption_clerk_id` stays NULL (its FK to lieutenant lands Task 6, per 0005 migration note).
//   - The intel-scanner PURCHASE flow (`last_intel_purchased_at`, BO `/admin/bpd/*`) is DEFERRED to the BO
//     ops surface; this task populates the CORE columns (suspicion_map, top_5_buildings, raid_temperature,
//     last_raid_at).
//
// 04e-A1 C7 (★ Substrate 2 — federal investigator, design §4.2, migration 0108): a SEPARATE
// `federal_investigators` table (NOT a retrofit of `precinct_memory` above) models E-POL-11's federal
// task force — DISTINCT suspicion parameters (slower decay, more surgical targeting) + a
// `corruption_exempt` flag. `runFederalInvestigatorReconcile` (NIGHTLY/20, below) spawns/despawns it by
// reading the E-POL-11 GLOBAL effect-modifier signal (`isFederalInvestigatorSignalActive`,
// police-memory-tunables.ts) fresh every tick — additive, zero-regression for every existing precinct
// tick above. HONESTY (design §9 item 3, locked): the corrupt-clerk mutation path is itself inert (see
// the `corruption_clerk_id` note above), so immunity is proven by a targeted rejection guard
// (`federal-investigator.guard.ts`'s `attemptCorruptClerkMutation`), not a live contest — see that
// file's header for the full framing.
//
// DETERMINISM (NO RNG — reproducible; the E2E asserts identical belief signatures for identically-advanced
// players): the tile bump magnitude is a fixed function of the event's qualitative severity; decay is a fixed
// arithmetic step; the precinct-review softmax target selection is a deterministic ARGMAX over the softmax
// weights (with a stable tile-index tie-break) — "stochastic sampling" reduces to its deterministic mode here
// (the temperature still SHAPES the weights, but selection is reproducible); the raid-vs-undercover decision
// is a deterministic hash-gate (hash(player+precinct+gameMinute) vs the probability thresholds) so two
// identical players decide identically. Real RNG-sampled targeting lands when a seeded-PRNG per-save is wired.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

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
  CityEventBus,
  type FlowCellCongestedEvent,
  type WhisperActivatedEvent,
  type PatrolObservationEvent,
  type RaidPlannedEvent,
  type BuildingEvidenceFoundEvent,
  type BossMirrorRuleDeclaredEvent,
  type BossMirrorRuleRetractedEvent,
} from '../events/city-event-bus';
import { policeMemoryTunables, SUSPICION_MAP_BYTES, isFederalInvestigatorSignalActive } from './police-memory-tunables';
import { reputationTunables } from '../../operational/reputation/reputation-tunables';
import {
  PoliceMemoryRepository,
  type PrecinctMemoryMutation,
  type PrecinctMemoryState,
} from './police_memory.repository';
import { districtToPrecinct } from '../district-precinct';

/** uint8 tile domain bound (a suspicion_map tile is one byte, 0..255). */
const TILE_MAX = 255;

/** Bump magnitudes per observed-event qualitative severity (deterministic — never a raw scalar from the event). */
const BUMP_FLOW_SATURATED = 40; // a SATURATED flow cell is a strong congestion signal.
const BUMP_FLOW_CONGESTED = 20; // a CONGESTED flow cell is a moderate signal.
const BUMP_WHISPER = 60; // an informant whisper activating is the strongest direct observation.
// System 3↔4 HANDOFF: a patrol observation bumps suspicion by its qualitative severity band (System 4 → System 3).
const BUMP_PATROL_HIGH = 50; // a HIGH-severity patrol sighting is a strong belief signal (a saturated block).
const BUMP_PATROL_MEDIUM = 25; // a MEDIUM-severity patrol sighting is a moderate signal.
// System 6→3 BPD REFERRAL (T7): a dispatched MIS inspection that found evidence bumps suspicion by its
// qualitative referral-severity band (system_6 Inv 6 — an OBSERVATION feeding SuspicionMap, never a raid).
const BUMP_EVIDENCE_CRITICAL = 70; // CRIMINAL_EVIDENCE referral — the strongest BPD-relevant MIS signal.
const BUMP_EVIDENCE_HIGH = 45; // VIOLATION_MAJOR referral — a strong asset-freeze-grade signal.

/** How many top buildings the precinct review tracks (system_3 §États top_5_buildings[5]). */
const TOP_N = 5;

/**
 * A single entry in the declaration_ledger JSONB ring (G31 — system_3 :87-99).
 * Shape matches the R3a DeclarationEntry (reputation-test.controller.ts).
 * FLAG (b) [PROV-Y26Q2]: only severity (0-100) included; scope/magnitude_bucket deferred.
 */
interface DeclarationLedgerEntry {
  entry_id: string;          // uuid
  building_id: number;       // building_id (G31 :91); tile_offset = building_id % SUSPICION_MAP_BYTES
  declaration_type: string;  // DeclarationType value — bare string domain (additive, no allow-list).
                             //   Known values (R9.3-backported in docs/tech/09_data_model/schema_city_state.md):
                             //   'boss_mirror_violation'       — D2 R3b: BossMirror declared/retracted.
                             //   'forensic_benford_soft_flag'  — C8 lot Forensic: §5.1 Benford χ² soft-flag
                             //                                    (DD-SOFTFLAG-DUAL, OQ-4).
                             //   'forensic_effluent_flag'      — C23 lot Forensic: §5.2 effluent inspector flag
                             //                                    (EffluentFlagDetected bus subscriber).
                             //   'forensic_lifestyle_gap'      — C23 lot Forensic: §5.3 lifestyle standing-gap
                             //                                    tail ramp (LifestyleGapFlag bus subscriber).
                             //   'courier_caught_leak'         — System 9 §9 C10: the caught-courier confession
                             //                                    channel (OQ-18 dual BPD channel). Written on
                             //                                    LAWYER_UP/ABANDON resolution (silent = no entry).
                             //                                    Severity = band of the leak magnitude (0..100).
  severity: number;          // 0-100 (integer bucket — mutable by Tick2 decay in-place)
  source_origin_id: string;  // courier / lieutenant / legal_case ID
  written_at: number;        // game-minute (or wall-clock ms for R3a; used for ordering + retention check)
}

/** Default severity for a BossMirrorRuleDeclared/Retracted event written to the declaration ring (G31). */
const BOSS_MIRROR_DECLARED_SEVERITY  = 50; // mid-range bucket (0-100); tunable in future if needed
const BOSS_MIRROR_RETRACTED_SEVERITY = 25; // lighter — retraction is a weaker signal than a violation

@Injectable()
export class PoliceMemoryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PoliceMemoryService.name);

  /** districtId → precinctId (the contiguous-grouping mapping, built once at bootstrap from seeded geography). */
  private districtToPrecinct = new Map<number, number>();
  /** blockId → districtId (seeded geography; read once at bootstrap). */
  private blockToDistrict = new Map<number, number>();

  /** The canonical precinct ids (1..precinctCount). */
  private precinctIds: number[] = [];

  /** Per-player IN-MEMORY working copy of the 6 suspicion buffers (keyed playerId → precinctId → Buffer). */
  private readonly workingMaps = new Map<string, Map<number, Buffer>>();
  /** Per-player set of precinct ids whose working buffer is dirty (needs flushing). */
  private readonly dirty = new Map<string, Set<number>>();
  /** Per-player guard so the lazy seed + hydrate runs at most once per process under concurrent first ticks. */
  private readonly seededPlayers = new Set<string>();

  /**
   * Per-player throttle counters for the declaration-ledger write hook (G31 :163).
   * Keys: `${playerId}:${precinctId}:${gameMinute}` → write count this minute.
   * Entries are evicted lazily when the minute changes (the throttle window is per-minute).
   * write_hook_throttle_per_minute caps the total writes per player per minute across all precincts.
   */
  private readonly declarationWriteThrottle = new Map<string, number>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: PoliceMemoryRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: geography mapping + subscriptions + registration ─────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    await this.loadGeographyMapping();
    this.subscribeToObservations();
    this.subscribeToDeclarationChannel(); // D2 R3b: G31 Boss Mirror violation acceptor
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Build the block→district + district→precinct maps ONCE (R9.3 — reads seeded geography, never writes).
   * Precinct ↔ district = contiguous district-id grouping (3 districts/precinct): precinct = ⌈district/3⌉.
   */
  private async loadGeographyMapping(): Promise<void> {
    const rows = await this.db
      .select({ id: blocks.id, district_id: blocks.district_id })
      .from(blocks)
      .orderBy(asc(blocks.id));
    for (const b of rows) this.blockToDistrict.set(b.id, b.district_id);

    this.precinctIds = Array.from({ length: policeMemoryTunables.precinctCount }, (_, i) => i + 1);
    // district d (1-based) → precinct ⌈d/3⌉, clamped to the precinct count (defensive against >18 districts).
    const distinctDistricts = new Set(rows.map((r) => r.district_id));
    for (const d of distinctDistricts) {
      // S12-e — la règle vit désormais dans `citysim/district-precinct.ts`, PRODUCTEUR UNIQUE, pour
      // que la projection `/v1/world/districts` serve exactement la même que ce service applique.
      this.districtToPrecinct.set(d, districtToPrecinct(d, policeMemoryTunables.precinctCount));
    }
    this.logger.log(
      `loaded geography mapping: ${this.blockToDistrict.size} blocks → ${distinctDistricts.size} districts → ` +
        `${policeMemoryTunables.precinctCount} precincts (contiguous 3-districts/precinct grouping)`,
    );
  }

  /**
   * Subscribe to the CityEventBus for the observation channel (Tick 1). FlowCellCongested + WhisperActivated
   * are the day-1 patrol-observation feeds (system_3 §Update tick Tick 1 + cross_system_interactions §Table
   * des events: WhisperActivatedEvent → System 3 suspicion_map). The handlers are synchronous (the bus emits
   * sync) — they bump the in-memory working buffer + mark the player dirty; the MINUTE flush persists.
   */
  private subscribeToObservations(): void {
    this.bus.onFlowCellCongested((e) => this.onFlowCellCongested(e));
    this.bus.onWhisperActivated((e) => this.onWhisperActivated(e));
    // System 3↔4 HANDOFF (T5): System 4's 30-min patrol observations are a NEW suspicion SOURCE — bump the
    // precinct tile when a high-severity patrol observation is recorded (cross_system_interactions L156).
    this.bus.onPatrolObservation((e) => this.onPatrolObservation(e));
    // System 3↔4 HANDOFF (T5): the POST-RAID memory update. System 4 emits RaidPlannedEvent at its 12h review;
    // System 3 consumes it and stamps last_raid_at (System 3 owns its own table write — System 4 never mutates
    // precinct_memory, Inv 6). cross_system_interactions L92/134: System 3 consommateur de RaidPlannedEvent.
    this.bus.onRaidPlanned((e) => this.onRaidPlanned(e));
    // System 6→3 BPD REFERRAL (T7): System 6 (Inspection Queue) emits BuildingEvidenceFoundEvent at its 12h
    // dispatch when an inspection finds evidence — a conditional OBSERVATION (system_6 Inv 6), NOT a raid. System
    // 3 SUBSCRIBES and bumps the owning precinct's suspicion tile (a NEW suspicion SOURCE alongside FlowCell /
    // Whisper / PatrolObservation — the MIS-referral channel). The bump is in-memory + dirty-marked; persisted by
    // the MINUTE/5 flush OR the TWELVE_H/4 review (which runs AFTER System 6's TWELVE_H/2 dispatch in the same
    // 12h tick, so a same-tick referral lands persisted via the review's whole-map write).
    this.bus.onBuildingEvidenceFound((e) => this.onBuildingEvidenceFound(e));
  }

  /**
   * D2 R3b — Subscribe to the Boss Mirror declaration channel (G31 write hook).
   * Mirrors the `subscribeToObservations` pattern: each handler is synchronous (the bus emits sync)
   * and fires an async DB write via fire-and-forget (void + catch) — identical to `onRaidPlanned`.
   *
   * On a BossMirrorRuleDeclaredEvent:  write a 'boss_mirror_violation' DeclarationEntry to the precinct's ring.
   * On a BossMirrorRuleRetractedEvent: write a lighter 'boss_mirror_violation' entry (retraction = weaker signal).
   *
   * Both subscriptions write to ALL of the player's precincts (the declaration is a city-wide signal —
   * the same rule covers the entire operation; each precinct's ring gets an entry). The per-precinct ring
   * depth bounds (declaration_ledger_size_per_precinct + max_entries_per_building) prevent unbounded growth.
   * The write_hook_throttle_per_minute is respected to prevent event-storm flooding (G31 :163).
   */
  private subscribeToDeclarationChannel(): void {
    this.bus.onBossMirrorRuleDeclared((e) => this.onBossMirrorRuleDeclared(e));
    this.bus.onBossMirrorRuleRetracted((e) => this.onBossMirrorRuleRetracted(e));
  }

  /**
   * Register the maintenance-pass cadences System 3 occupies (one CitySimSystem per slot — the registry
   * contract). The ON_EVENT slot is driven by the BUS (the subscriptions above), not the cadence loop, so its
   * placeholder `run` stays a no-op (the bus is the real driver); the genuine work is at MINUTE (flush),
   * TWELVE_H (review), NIGHTLY (decay).
   */
  private registerCadences(): void {
    this.scheduler.registerSystem(this.makeSystem(Cadence.ON_EVENT, 1, () => {
      /* ON_EVENT is bus-driven (subscribeToObservations); the scheduler slot is owned but the run is a no-op. */
    }));
    this.scheduler.registerSystem(this.makeSystem(Cadence.MINUTE, 5, (ctx) => this.runObservationFlush(ctx)));
    this.scheduler.registerSystem(this.makeSystem(Cadence.TWELVE_H, 4, (ctx) => this.runPrecinctReview(ctx)));
    this.scheduler.registerSystem(this.makeSystem(Cadence.NIGHTLY, 3, (ctx) => this.runDailyDecay(ctx)));
    // 04e-A1 C7 (★ Substrate 2 — federal investigator, design §4.2): NIGHTLY/20, the next free NIGHTLY
    // slot (after META_MARKET_ANTICHEAT_TICK/19) — independent of the Tick 2 decay pass above (order 3),
    // this reconciles the SEPARATE federal_investigators table against the CURRENT E-POL-11 signal.
    this.scheduler.registerSystem(this.makeSystem(Cadence.NIGHTLY, 20, (ctx) => this.runFederalInvestigatorReconcile(ctx)));
  }

  private makeSystem(
    cadence: Cadence,
    order: number,
    run: (ctx: CitySimTickContext) => void | Promise<void>,
  ): CitySimSystem {
    return { id: CitySystemId.POLICE_MEMORY, cadence, order, run };
  }

  /** F4 RAM budget log (system_3 §invariant 7): ~1.2 KB per precinct × 6 ≈ 7.2 KB suspicion maps. */
  private logRamBudget(): void {
    const kb = Math.round((SUSPICION_MAP_BYTES * policeMemoryTunables.precinctCount) / 1024);
    this.logger.log(
      `Police Memory per-player RAM budget ≈ ${kb} KB suspicion maps (${policeMemoryTunables.precinctCount} × ` +
        `${SUSPICION_MAP_BYTES} B, PERSISTED in precinct_memory). G31 declaration_ledger ACTIVE (D2 R3b — ` +
        `boss_mirror_violation channel subscribed; Tick2 decay + Tick3 G31 scoring wired; ` +
        `declaration_ledger JSONB column exists since R3a migration 0052). ` +
        `corruption_clerk_id stays NULL (clerk depth deferred).`,
    );
  }

  // ───────────────────────────── Tick 1 — per-observation belief accumulation (ON_EVENT) ─────────────────────────────

  private onFlowCellCongested(e: FlowCellCongestedEvent): void {
    // Only react to a transition INTO a congested state (the bump models the observation of congestion).
    const bump = e.to === 'SATURATED' ? BUMP_FLOW_SATURATED : e.to === 'CONGESTED' ? BUMP_FLOW_CONGESTED : 0;
    if (bump === 0) return;
    this.bumpObservation(e.playerId, e.districtId, e.blockId, bump);
  }

  private onWhisperActivated(e: WhisperActivatedEvent): void {
    const districtId = this.blockToDistrict.get(e.homeBlockId);
    if (districtId === undefined) return;
    this.bumpObservation(e.playerId, districtId, e.homeBlockId, BUMP_WHISPER);
  }

  /**
   * System 3↔4 HANDOFF (T5): a patrol observation (System 4, 30-min) bumps the OWNING precinct's suspicion
   * tile by its qualitative severity band. This is a NEW suspicion SOURCE alongside FlowCell/Whisper — the
   * patrol channel feeding police memory (cross_system_interactions L156). Synchronous (in-memory bump,
   * MINUTE/5-flushed) — identical persistence cadence to the other observation sources.
   */
  private onPatrolObservation(e: PatrolObservationEvent): void {
    const bump = e.severity === 'HIGH' ? BUMP_PATROL_HIGH : e.severity === 'MEDIUM' ? BUMP_PATROL_MEDIUM : 0;
    if (bump === 0) return;
    this.bumpObservation(e.playerId, e.districtId, e.blockId, bump);
  }

  /**
   * System 6→3 BPD REFERRAL (T7): a dispatched MIS inspection that found evidence (System 6, 12h dispatch) bumps
   * the OWNING precinct's suspicion tile by its qualitative referral-severity band. This is a NEW suspicion
   * SOURCE alongside FlowCell / Whisper / PatrolObservation — the MIS-referral channel feeding police memory
   * (system_6 Inv 6 — MIS produces an OBSERVATION, never a raid). Synchronous (in-memory bump, MINUTE/5- or
   * TWELVE_H/4-flushed) — identical persistence cadence to the other observation sources. The bump targets the
   * building's district → owning precinct (the same ⌈district/3⌉ grouping the other sources use).
   */
  private onBuildingEvidenceFound(e: BuildingEvidenceFoundEvent): void {
    const bump = e.severity === 'CRITICAL' ? BUMP_EVIDENCE_CRITICAL : e.severity === 'HIGH' ? BUMP_EVIDENCE_HIGH : 0;
    if (bump === 0) return;
    this.bumpObservation(e.playerId, e.districtId, e.buildingId, bump);
  }

  /**
   * D2 R3b — G31 write hook (Tick 1 subscription): BossMirrorRuleDeclaredEvent.
   * A player DECLARING a new public rule is a moderate-severity signal to all precincts (G31 :169).
   * Writes a 'boss_mirror_violation' DeclarationEntry to each of the player's precincts' rings.
   * Fire-and-forget (the bus emits synchronously; the DB write is async via void + catch).
   */
  private onBossMirrorRuleDeclared(e: BossMirrorRuleDeclaredEvent): void {
    void this.writeDeclarationToAllPrecincts(
      e.playerId,
      'boss_mirror_violation',
      BOSS_MIRROR_DECLARED_SEVERITY,
      e.ruleId,
      e.gameMinute,
    ).catch((err) =>
      this.logger.error(
        `G31 declaration write failed (BossMirrorRuleDeclared, player=${e.playerId}, rule=${e.ruleId}): ` +
          `${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  /**
   * D2 R3b — G31 write hook (Tick 1 subscription): BossMirrorRuleRetractedEvent.
   * A retraction is itself a public observable signal — rivals read it as weakness (:63).
   * Writes a lighter 'boss_mirror_violation' entry (retraction = weaker than a fresh declaration).
   * Fire-and-forget (identical pattern to BossMirrorRuleDeclared and onRaidPlanned).
   */
  private onBossMirrorRuleRetracted(e: BossMirrorRuleRetractedEvent): void {
    void this.writeDeclarationToAllPrecincts(
      e.playerId,
      'boss_mirror_violation',
      BOSS_MIRROR_RETRACTED_SEVERITY,
      e.ruleId,
      e.gameMinute,
    ).catch((err) =>
      this.logger.error(
        `G31 declaration write failed (BossMirrorRuleRetracted, player=${e.playerId}, rule=${e.ruleId}): ` +
          `${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  /**
   * Write a DeclarationEntry to ALL of a player's precincts (G31 :169 — the declaration is city-wide).
   * Respects write_hook_throttle_per_minute: if the player has already written maxThrottle entries this
   * in-game minute, the write is skipped (anti-spam guard, G31 :163). The throttle key rotates by minute.
   */
  private async writeDeclarationToAllPrecincts(
    playerId: string,
    declarationType: string,
    severity: number,
    sourceOriginId: string,
    gameMinute: number,
  ): Promise<void> {
    const maxPrecinct    = reputationTunables.declarationLedgerSizePerPrecinct;
    const maxPerBuilding = reputationTunables.declarationLedgerMaxEntriesPerBuilding;
    const maxThrottle    = reputationTunables.declarationLedgerWriteHookThrottlePerMinute;

    // Throttle check: key = player + minute bucket. Evict stale keys lazily (different minute → reset).
    const throttleKey = `${playerId}:${gameMinute}`;
    const writeCount  = this.declarationWriteThrottle.get(throttleKey) ?? 0;
    if (writeCount >= maxThrottle) {
      this.logger.warn(
        `G31 write_hook_throttle reached (player=${playerId}, minute=${gameMinute}, ` +
          `count=${writeCount}/${maxThrottle}) — declaration skipped`,
      );
      return;
    }
    this.declarationWriteThrottle.set(throttleKey, writeCount + 1);
    // Lazy eviction: clean keys from previous minutes to bound the Map size.
    for (const key of [...this.declarationWriteThrottle.keys()]) {
      const keyMinute = parseInt(key.split(':')[1] ?? '0', 10);
      if (keyMinute !== gameMinute) this.declarationWriteThrottle.delete(key);
    }

    // Write a DeclarationEntry to each precinct (city-wide signal).
    // building_id = 0 (a synthetic building id for the city-wide channel — maps to tile offset 0).
    // This is distinct from a building-specific entry (the 04c/04d emitters supply a real building_id).
    const entry: DeclarationLedgerEntry = {
      entry_id:         randomUUID(),
      building_id:      0, // city-wide channel: tile_offset = 0 % SUSPICION_MAP_BYTES = 0
      declaration_type: declarationType,
      severity:         Math.min(100, Math.max(0, Math.trunc(severity))),
      source_origin_id: sourceOriginId,
      written_at:       gameMinute,
    };

    await Promise.all(
      this.precinctIds.map((precinctId) =>
        this.repo.appendDeclarationEntry(playerId, precinctId, entry, maxPrecinct, maxPerBuilding),
      ),
    );
  }

  /**
   * System 3↔4 HANDOFF (T5): POST-RAID memory update. System 4 emits RaidPlannedEvent at its 12h review;
   * System 3 stamps last_raid_at on the precinct (its OWN table write — System 4 never mutates precinct_memory,
   * Inv 6). The bus emits synchronously so this fire-and-forgets the DB write with its own error isolation
   * (the bus dispatch can't await; a failed stamp is logged, never thrown back into the emitting tick).
   */
  private onRaidPlanned(e: RaidPlannedEvent): void {
    void this.repo
      .stampLastRaid(e.playerId, e.precinctId, new Date())
      .catch((err) =>
        this.logger.error(
          `post-raid last_raid_at stamp failed (player=${e.playerId}, precinct=${e.precinctId}): ` +
            `${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }

  /**
   * Bump the suspicion_map tile of the precinct that OWNS this block's district (Tick 1). The tile within the
   * precinct's 32×32 map is a deterministic function of the block id (block → byte offset = blockId mod 1024),
   * so the same block always bumps the same tile of its precinct's map. Clamped to the uint8 domain. The bump
   * mutates the in-memory working buffer (synchronous) + marks the player+precinct dirty. NO-OP if the player
   * is not yet seeded/hydrated (the first MINUTE/cadence tick seeds + hydrates before any flush).
   */
  private bumpObservation(playerId: string, districtId: number, blockId: number, magnitude: number): void {
    const precinctId = this.districtToPrecinct.get(districtId);
    if (precinctId === undefined) return;
    const maps = this.workingMaps.get(playerId);
    // FIRST-MINUTE PRE-HYDRATION DROP (intentional): the 2 Hz observation band can emit before the first
    // MINUTE/5 flush slot has seeded + hydrated this player's working buffers. Such pre-hydration events are
    // DELIBERATELY dropped — the minute-1 baseline is all-zeros belief anyway, so belief only accrues from
    // the first flush onward (no observation is lost once the player is hydrated). Documentation only.
    if (!maps) return; // not hydrated yet — the bump is dropped (the seed runs on the first cadence tick).
    const buf = maps.get(precinctId);
    if (!buf) return;
    const offset = blockId % SUSPICION_MAP_BYTES;
    const next = Math.min(TILE_MAX, buf[offset] + magnitude);
    if (next !== buf[offset]) {
      buf[offset] = next;
      this.markDirty(playerId, precinctId);
    }
  }

  private markDirty(playerId: string, precinctId: number): void {
    const set = this.dirty.get(playerId) ?? new Set<number>();
    set.add(precinctId);
    this.dirty.set(playerId, set);
  }

  // ───────────────────────────── the three registered cadence ticks ─────────────────────────────

  /**
   * {MINUTE, order 5} — OBSERVATION FLUSH: persist the dirty in-memory suspicion buffers to `precinct_memory`
   * in ONE batched UPDATE (the persistence of the Tick 1 ON_EVENT accumulation). Ensures the player is seeded
   * + hydrated first (so a player that begins ticking before any 12h/nightly boundary still gets its 6 rows).
   */
  private async runObservationFlush(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);
    await this.flushDirty(ctx.playerId);
  }

  /**
   * {NIGHTLY, order 3} — DECAY PASS (Tick 2, "chaque jour in-game"):
   *
   * Phase A — suspicion_map tile decay (existing path, UNCHANGED):
   *   Every tile decays by memory_decay_per_tile_per_day (scaled to the uint8 0..255 domain → a fixed integer
   *   step). Tiles already at 0 stay 0. Memory is ephemeral — a long quiet span cools the precinct.
   *   Deterministic. Operates on the in-memory buffers then flushes the whole set.
   *
   * Phase B — declaration_ledger ring decay (D2 R3b, system_3 :144-146):
   *   For each active DeclarationEntry in the ring, reduce severity by the per-day fractional decay derived
   *   from the half-life. The decay factor per day is: 0.5^(1/half_life_days).
   *   An entry's severity is clamped to ≥ 0. Entries with severity = 0 are swept (retired) if they are older
   *   than entry_retention_days. The mutated ring is persisted in a targeted single-column UPDATE.
   *
   * ZERO-REGRESSION: Phase B is SKIPPED entirely if the precinct has no declaration entries (null or []).
   *   The suspicion_map tile decay path (Phase A) is byte-identical to the pre-R3b path.
   */
  private async runDailyDecay(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);
    const maps = this.workingMaps.get(ctx.playerId);
    if (!maps) return;

    // Phase A — suspicion_map tile decay (UNCHANGED — no declaration path touches the buffer).
    const step = Math.max(1, Math.round(policeMemoryTunables.memoryDecayPerTilePerDay * TILE_MAX));
    for (const precinctId of this.precinctIds) {
      const buf = maps.get(precinctId);
      if (!buf) continue;
      let changed = false;
      for (let i = 0; i < buf.length; i += 1) {
        if (buf[i] > 0) {
          buf[i] = Math.max(0, buf[i] - step);
          changed = true;
        }
      }
      if (changed) this.markDirty(ctx.playerId, precinctId);
    }
    await this.flushDirty(ctx.playerId);

    // Phase B — declaration_ledger ring decay (D2 R3b, system_3 :144-146).
    // Decay factor per in-game day for boss_mirror_violation entries (the ONLY type active in R3b).
    // half_life_days default = 30 → factor = 0.5^(1/30) ≈ 0.9772 per day (a ≈2.3% daily reduction).
    const halfLifeDays  = reputationTunables.declarationLedgerHalfLifeBossMirrorDays;
    const retentionDays = reputationTunables.declarationLedgerEntryRetentionDays;
    // Per-day decay factor: severity_new = severity_old × factor.
    // We track in integer (0..100); step down by (severity × (1 - factor)) floored, min step 0.
    const decayFactor = Math.pow(0.5, 1.0 / Math.max(1, halfLifeDays));
    // Retention threshold in game-minutes (entry_retention_days × 1440 min/day).
    // `written_at` may be in game-minutes OR wall-clock ms (R3a used wall-clock for the test primitive).
    // We use the current game-minute to guard against phantom retention (see comment below).
    const retentionThresholdMinutes = retentionDays * 1440;

    for (const precinctId of this.precinctIds) {
      const entries = await this.repo.getDeclarationLedger(ctx.playerId, precinctId);
      if (!entries || entries.length === 0) continue; // ZERO-REGRESSION: no entries → skip entirely.

      let ledgerChanged = false;
      const survived: DeclarationLedgerEntry[] = [];

      for (const raw of entries) {
        const e = raw as DeclarationLedgerEntry;
        // Decay the severity by one day's factor.
        const decayed = Math.max(0, Math.floor(e.severity * decayFactor));
        // Sweep check: retire an entry if its severity has reached 0 AND it is older than retention_days.
        // `written_at` comparison: if written_at is a game-minute (≤ game-minute-scale values, typically
        // < 10M for a multi-year game), compare against ctx.gameMinute; if it's wall-clock ms (> 1e12),
        // treat the entry as "recently written" and do NOT sweep it yet (R3a wrote wall-clock ms —
        // defensive guard so test-written entries are not immediately swept).
        const isGameMinuteTimestamp = e.written_at < 1e10; // game-minutes are O(1e5..1e7); wall-clock ms are O(1e12)
        const ageInMinutes = isGameMinuteTimestamp ? ctx.gameMinute - e.written_at : 0;
        const fullyDecayed = decayed <= 0 && ageInMinutes >= retentionThresholdMinutes;

        if (!fullyDecayed) {
          survived.push({ ...e, severity: decayed });
          if (decayed !== e.severity) ledgerChanged = true;
        } else {
          ledgerChanged = true; // entry swept
        }
      }

      if (ledgerChanged) {
        await this.repo.updateDeclarationLedger(ctx.playerId, precinctId, survived);
      }
    }
  }

  // ───────────────────────────── C7 — ★ Substrate 2: federal investigator (design §4.2) ─────────────────────────────

  /**
   * {NIGHTLY, order 20} — FEDERAL INVESTIGATOR RECONCILE (04e-A1 C7, design §4.2): reads
   * `isFederalInvestigatorSignalActive()` FRESH every tick — true iff a GLOBAL `effect_modifier`
   * currently shifts EITHER federal BASE tunable (`federalSuspicionDecayPerTilePerDay` /
   * `federalRaidTargetTemperature`) away from its own base (a political-event-shaped modifier, applied
   * via the REAL `EffectModifierService.applyEvent` — E-POL-11 at A2, a synthetic one at C7's own
   * live-fire).
   *
   *   - ACTIVE   → SPAWN/MAINTAIN: upsert this player's `federal_investigators` row, snapshotting the
   *     CURRENT overlay-composed DISTINCT suspicion parameters + `corruption_exempt=true` (always —
   *     the honest-scaffolding immunity flag, design §9 item 3).
   *   - INACTIVE → DESPAWN: delete the row if present.
   *
   * Idempotent: re-running with the SAME signal state is a no-op (an upsert with identical values, or
   * a DELETE matching zero rows). GLOBAL scope (design §3 lever table, "E-POL-11 … Scope G") — mirrors
   * C6's audit-pin substrate: the effect-modifier is city-wide, but `federal_investigators` is a
   * per-player table (mirrors `precinct_memory`), so the reconciliation naturally runs per-player-tick.
   * A pure function of `(TunablesStore base, EffectOverlayStore snapshot, this player's DB row)` — no
   * `Math.random`/`Date.now()` (design "Determinism").
   */
  private async runFederalInvestigatorReconcile(ctx: CitySimTickContext): Promise<void> {
    if (isFederalInvestigatorSignalActive()) {
      await this.repo.upsertFederalInvestigator(ctx.playerId, {
        suspicionDecayPerDay: policeMemoryTunables.federalSuspicionDecayPerTilePerDay,
        raidTemperature: policeMemoryTunables.federalRaidTargetTemperature,
      });
    } else {
      await this.repo.despawnFederalInvestigator(ctx.playerId);
    }
  }

  /**
   * {TWELVE_H, order 4} — PRECINCT REVIEW (Tick 3): for each precinct recompute top_5_buildings from the
   * hottest tiles in the softmax raid-target ORDER (deterministic argmax over the temperature-shaped weights —
   * the hottest target first). Persists top_5_buildings + the clamped raid_temperature. Flushes the batch.
   *
   * HANDOFF (T5): this review NO LONGER emits RaidPlanned/Undercover and NO LONGER stamps last_raid_at — System
   * 4 (Patrol Doctrine) OWNS the raid/undercover decision + emission at its own 12h review (which READS the
   * top_5_buildings this method persists, via getTopTargets — Inv 6 read-only). last_raid_at is now stamped by
   * System 3's RaidPlannedEvent subscription (post-raid memory update). System 3 produces NO cross-system event
   * (cross_system_interactions L116). The TWELVE_H DAG places System 3 LAST (order 4) so System 4 (order 1) reads
   * the PREVIOUS cycle's persisted top_5_buildings — this method refreshes them for the NEXT cycle.
   *
   * D2 R3b — G31 scoring extension (system_3 :148-152):
   *   final_tile_score = patrol_observation_score + weight_vs_patrol × declaration_severity_sum
   *   Where declaration_severity_sum = Σ severity of active entries in the ring where
   *     entry.building_id % SUSPICION_MAP_BYTES === tile_offset.
   *
   * ZERO-REGRESSION INVARIANT: If a precinct has NO declaration entries (null / []):
   *   - declaration_severity_sum = 0 for EVERY tile_offset.
   *   - final_tile_score = patrol_observation_score + weight × 0 = patrol_observation_score.
   *   - The G31 term is gated: it is only applied when declaration_severity_sum > 0.
   *   - The topTiles + softmaxOrder result is byte-identical to the pre-R3b path.
   *   - The mutations written to the DB are byte-identical (no extra column touches).
   */
  private async runPrecinctReview(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);
    const maps = this.workingMaps.get(ctx.playerId);
    if (!maps) return;

    const mutations: PrecinctMemoryMutation[] = [];
    // Persisted raid_temperature is clamped to the DB CHECK [0..1] (the softmax COMPUTATION uses the full
    // tunable 0..2.0; the persisted column is a separate bounded field — see the tunables file header).
    // 04e-A1 C5: the scoped variant threads ctx.playerId (PLAYER scope); GLOBAL modifiers still match regardless.
    const persistedTemp = this.clampTemp(policeMemoryTunables.raidTargetTemperatureFor({ playerId: ctx.playerId }));

    // G31 weight (read from registry — never inline, DD-REG-NAME).
    const weightVsPatrol = reputationTunables.declarationLedgerWeightVsPatrol;

    for (const precinctId of this.precinctIds) {
      const buf = maps.get(precinctId);
      if (!buf) continue;

      // D2 R3b: read the declaration_ledger for this precinct (null / [] = no G31 contribution).
      // This is an async DB read per precinct (6 reads per Tick3 per player — bounded + cheap).
      const declEntries = await this.repo.getDeclarationLedger(ctx.playerId, precinctId);
      const hasDeclarations = declEntries !== null && declEntries.length > 0;

      // Compute per-tile declaration_severity_sum (ONLY if hasDeclarations — zero-regression gate).
      // Map: tile_offset → Σ severity of entries where building_id % SUSPICION_MAP_BYTES === tile_offset.
      const tileSeveritySum = new Map<number, number>();
      if (hasDeclarations) {
        for (const raw of declEntries!) {
          const e = raw as DeclarationLedgerEntry;
          if (e.severity > 0) {
            const tileOffset = e.building_id % SUSPICION_MAP_BYTES;
            tileSeveritySum.set(tileOffset, (tileSeveritySum.get(tileOffset) ?? 0) + e.severity);
          }
        }
      }

      // G31-augmented tile scoring: build a virtual score array for top-tile selection.
      // For precincts with NO declaration entries (hasDeclarations = false), we skip augmentation entirely
      // (tileSeveritySum is empty → the gate below is never entered → byte-identical to pre-R3b path).
      let top: { offset: number; value: number }[];
      if (!hasDeclarations && tileSeveritySum.size === 0) {
        // ZERO-REGRESSION PATH: no declarations → identical to the pre-R3b topTiles call.
        top = this.topTiles(buf, TOP_N);
      } else {
        // G31 PATH: augment each tile's score with the G31 term, then select the top-N.
        // Tiles with patrol_observation_score > 0 OR declaration_severity_sum > 0 are candidates.
        const augmented: { offset: number; value: number }[] = [];
        // Add patrol-observed tiles (those with patrol_observation_score > 0).
        for (let i = 0; i < buf.length; i += 1) {
          const patrolScore = buf[i];
          const declSum     = tileSeveritySum.get(i) ?? 0;
          const finalScore  = patrolScore > 0 || declSum > 0
            ? patrolScore + (declSum > 0 ? weightVsPatrol * declSum : 0)
            : 0;
          if (finalScore > 0) {
            augmented.push({ offset: i, value: finalScore });
          }
        }
        // Also add tiles that have ONLY declaration entries (patrol_observation_score = 0, declSum > 0).
        // These are already handled above (the `patrolScore + weightVsPatrol × declSum` branch).
        augmented.sort((a, b) => (b.value - a.value) || (a.offset - b.offset));
        top = augmented.slice(0, TOP_N);
      }

      const ordered = this.softmaxOrder(top, policeMemoryTunables.raidTargetTemperatureFor({ playerId: ctx.playerId }));
      const topBuildings = ordered.map((t) => t.offset); // representative building id = tile offset (lossy unit).

      mutations.push({
        precinct_id: precinctId,
        suspicion_map: buf,
        top_5_buildings: topBuildings,
        raid_temperature: persistedTemp,
      });
    }

    if (mutations.length > 0) {
      await this.repo.applyMutations(ctx.playerId, mutations);
      this.dirty.delete(ctx.playerId); // the review write covered every precinct.
    }
  }

  // ───────────────────────────── precinct-review helpers (deterministic) ─────────────────────────────

  /** The TOP_N hottest tiles of a suspicion_map (offset + value), value-desc with a stable offset tie-break. */
  private topTiles(buf: Buffer, n: number): { offset: number; value: number }[] {
    const tiles: { offset: number; value: number }[] = [];
    for (let i = 0; i < buf.length; i += 1) if (buf[i] > 0) tiles.push({ offset: i, value: buf[i] });
    tiles.sort((a, b) => (b.value - a.value) || (a.offset - b.offset));
    return tiles.slice(0, n);
  }

  /**
   * Deterministic softmax target ORDER. The temperature SHAPES the weights (exp(value/255/T)); with T→0 the
   * weight mass concentrates on the max (greedy), with larger T it flattens. The returned order is by softmax
   * weight DESC with a stable offset tie-break — "stochastic sampling" reduced to its deterministic mode so two
   * identical players order identically (real seeded-PRNG sampling lands later). Since softmax is monotonic in
   * value, this equals the value-desc order; the temperature is still consumed to shape the weights (it would
   * matter once true sampling is wired) — kept HONEST: it reads the tunable, computes the weights. This is the
   * target ORDER System 4 reads via getTopTargets (the hottest target first).
   */
  private softmaxOrder(
    top: { offset: number; value: number }[],
    temperature: number,
  ): { offset: number; value: number }[] {
    const t = Math.max(0.01, temperature); // guard T=0 (greedy) division.
    return [...top]
      .map((tile) => ({ tile, weight: Math.exp(tile.value / TILE_MAX / t) }))
      .sort((a, b) => b.weight - a.weight || a.tile.offset - b.tile.offset)
      .map((w) => w.tile);
  }

  private clampTemp(t: number): number {
    return Math.max(0, Math.min(1, t)); // the persisted raid_temperature column CHECK is [0..1].
  }

  // ───────────────────────────── flush + lazy seed/hydrate ─────────────────────────────

  /** Flush a player's dirty suspicion buffers to `precinct_memory` in ONE batched UPDATE (observation flush). */
  private async flushDirty(playerId: string): Promise<void> {
    const set = this.dirty.get(playerId);
    if (!set || set.size === 0) return;
    const maps = this.workingMaps.get(playerId);
    if (!maps) return;
    // Snapshot the precinct markers being flushed BEFORE the await. A marker added DURING the await (a
    // concurrent same-player advance via markDirty — not reachable today since continuous loops are OFF, but
    // latent) would otherwise be lost if we cleared the whole entry afterwards. By clearing only the
    // snapshotted precincts post-await, markers raised mid-flush survive to the next cycle.
    const flushed = [...set];
    const mutations: PrecinctMemoryMutation[] = [];
    for (const precinctId of flushed) {
      const buf = maps.get(precinctId);
      if (buf) mutations.push({ precinct_id: precinctId, suspicion_map: buf });
    }
    if (mutations.length > 0) await this.repo.applyMutations(playerId, mutations);
    for (const precinctId of flushed) set.delete(precinctId);
    if (set.size === 0) this.dirty.delete(playerId);
  }

  /**
   * Lazily seed the player's 6 precinct_memory rows on first tick + hydrate the in-memory working buffers from
   * the DB. Idempotent at THREE layers (mirrors SparseCitizens): (1) the per-process Set fast-path; (2) a DB
   * COUNT short-circuit; (3) the DURABLE race-safe guard in the repository's seedSixPrecincts (advisory lock +
   * NOT EXISTS). After seeding (or finding existing rows) it loads the authoritative buffers into memory.
   */
  private async ensureSeeded(playerId: string): Promise<void> {
    if (this.seededPlayers.has(playerId)) return;

    const existing = await this.repo.countPrecincts(playerId);
    if (existing === 0) {
      const zeroed = Buffer.alloc(SUSPICION_MAP_BYTES, 0); // all-tiles-0 (no belief yet).
      await this.repo.seedSixPrecincts(playerId, this.precinctIds, zeroed);
    }
    await this.hydrate(playerId);
    this.seededPlayers.add(playerId);
    if (existing === 0) {
      this.logger.log(
        `lazily seeded ${policeMemoryTunables.precinctCount} precinct_memory rows for player ${playerId}`,
      );
    }
  }

  /** Load a player's authoritative suspicion buffers from the DB into the in-memory working copy. */
  private async hydrate(playerId: string): Promise<void> {
    const rows = await this.repo.listPrecinctState(playerId);
    const maps = new Map<number, Buffer>();
    for (const r of rows) {
      // Own a COPY so in-memory bumps don't alias the row Buffer (and stay exactly 1024 bytes).
      const buf = Buffer.alloc(SUSPICION_MAP_BYTES, 0);
      r.suspicion_map.copy(buf, 0, 0, Math.min(SUSPICION_MAP_BYTES, r.suspicion_map.length));
      maps.set(r.precinct_id, buf);
    }
    this.workingMaps.set(playerId, maps);
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * C8 (System 9 Detection) — PUBLIC seed-and-hydrate + in-memory suspicion read for the C8 probe.
   *
   * `ensurePlayerSeeded` forces `ensureSeeded` for the given player so that in-process
   * `bumpObservation` calls (fired synchronously by `onPatrolObservation`) land in the hydrated
   * `workingMaps` rather than being dropped by the pre-hydration guard (bumpObservation:483).
   *
   * Without this call, a fresh test player has no in-memory working buffer, so the bus bump is
   * silently dropped, and a subsequent read returns 0 even after a hit.
   *
   * In production, the MINUTE/5 flush calls `ensureSeeded` lazily — no production path changed.
   *
   * `getInMemorySuspicion` reads the totalMass from the in-memory working buffer (not from the DB),
   * which is necessary because the PatrolObservationEvent bump is in-memory (synchronous) and is
   * flushed to DB only at the MINUTE/5 cadence. The C8 E2E reads BEFORE and AFTER the transit tick
   * to assert the bump fired. Reading from the in-memory buffer gives the immediate post-bump view.
   *
   * ADDITIVE — C8 only. No production path changed.
   */
  async ensurePlayerSeeded(playerId: string): Promise<void> {
    await this.ensureSeeded(playerId);
  }

  /**
   * Read the totalMass of the in-memory suspicion_map buffer for the given player/precinct.
   *
   * Returns the sum of all uint8 tiles in the working buffer (which is mutated synchronously
   * by `bumpObservation`). Returns 0 if the player is not yet seeded or the precinct has no buffer.
   *
   * C8 TEST-ONLY surface: called by `DistributionTestController.readSuspicion` to observe the
   * in-memory bump immediately after the transit tick (before the MINUTE/5 DB flush).
   */
  getInMemorySuspicion(playerId: string, precinctId: number): number {
    const maps = this.workingMaps.get(playerId);
    if (!maps) return 0;
    const buf = maps.get(precinctId);
    if (!buf) return 0;
    let total = 0;
    for (let i = 0; i < buf.length; i += 1) {
      total += buf[i];
    }
    return total;
  }

  /**
   * getSuspicionMapSnapshot (system_3 §NestJS) — the BO-only raw belief read for ONE precinct. Returns the
   * total belief mass + the peak tile (the substrate the projection buckets — NEVER exposed raw to the player).
   * Reads from the DB (the authoritative persisted state). null if the precinct row does not exist.
   */
  async getPrecinctBeliefRaw(
    playerId: string,
    precinctId: number,
  ): Promise<{ totalMass: number; peakTile: number } | null> {
    const state: PrecinctMemoryState | null = await this.repo.getPrecinctState(playerId, precinctId);
    if (!state) return null;
    let total = 0;
    let peak = 0;
    for (let i = 0; i < state.suspicion_map.length; i += 1) {
      total += state.suspicion_map[i];
      if (state.suspicion_map[i] > peak) peak = state.suspicion_map[i];
    }
    return { totalMass: total, peakTile: peak };
  }

  /** Whether a precinct id is in the canonical 1..precinctCount set (used by the controller for a clean 404). */
  isValidPrecinct(precinctId: number): boolean {
    return Number.isInteger(precinctId) && precinctId >= 1 && precinctId <= policeMemoryTunables.precinctCount;
  }

  /**
   * Public BPD declaration-ledger write hook (G31 — C8 forensic + future C23 lifecycle emitters).
   *
   * Writes a single `DeclarationEntry` to the `declaration_ledger` JSONB ring in `precinct_memory` for
   * a given player + precinct. This is the write-seam that forensic lot C8 uses for the
   * DD-SOFTFLAG-DUAL BPD-memory side (the second side is `forensic_soft_flag_ring.flag_ticks`).
   * Future emitters (C23: effluent / tail lifecycle) will ALSO call this method per event.
   *
   * This is a THIN DELEGATOR to `PoliceMemoryRepository.appendDeclarationEntry` — it reads the
   * two ring-bound tunables (maxPrecinct / maxPerBuilding) from reputationTunables so callers
   * don't need to know the cap values. No throttle on this path (the caller controls call frequency;
   * forensic writes are weekly — well within the per-minute throttle budget). No emit.
   *
   * DeclarationType values (bare `string` — additive; no allow-list):
   *   'boss_mirror_violation'          — D2 R3b: boss-mirror rule declared/retracted (existing).
   *   'forensic_benford_soft_flag'     — C8: §5.1 Benford χ² soft-flag (DD-SOFTFLAG-DUAL).
   *   'forensic_effluent_flag'         — C23: §5.2 effluent inspector flag (EffluentFlagDetected bus event).
   *   'forensic_lifestyle_gap'         — C23: §5.3 lifestyle standing-gap tail ramp (LifestyleGapFlag bus event).
   *   'courier_caught_leak'            — System 9 §9 C10: caught-courier confession channel (OQ-18); written on
   *                                      LAWYER_UP/ABANDON resolution (VIOLENT_SILENCE emits heat instead).
   *
   * @param playerId   - player uuid.
   * @param precinctId - target precinct (1..precinctCount).
   * @param declarationType - the DeclarationType string (e.g. 'forensic_benford_soft_flag').
   * @param severity   - 0-100 bucket (clamped to int).
   * @param sourceOriginId - front uuid or other emitter id for BPD tracing.
   * @param gameMinute - game-time for the `written_at` field (NEVER Date.now() in the forensic tick).
   */
  async appendDeclarationEntry(
    playerId: string,
    precinctId: number,
    declarationType: string,
    severity: number,
    sourceOriginId: string,
    gameMinute: number,
  ): Promise<void> {
    const maxPrecinct    = reputationTunables.declarationLedgerSizePerPrecinct;
    const maxPerBuilding = reputationTunables.declarationLedgerMaxEntriesPerBuilding;

    const entry = {
      entry_id:         randomUUID(),
      building_id:      0, // city-wide channel (tile_offset 0 % SUSPICION_MAP_BYTES — same as boss_mirror pattern)
      declaration_type: declarationType,
      severity:         Math.min(100, Math.max(0, Math.trunc(severity))),
      source_origin_id: sourceOriginId,
      written_at:       gameMinute,
    };

    await this.repo.appendDeclarationEntry(playerId, precinctId, entry, maxPrecinct, maxPerBuilding);
  }

  /**
   * getTopTargets (system_3 §NestJS + system_4 §Invariant 6 + cross_system_interactions §DAG System 3 → System 4)
   * — the READ-ONLY interface System 4 (Patrol Doctrine) consumes to enrich its raid targeting. Returns the
   * precinct's softmax-ordered top suspicion targets (the persisted `top_5_buildings`, hottest first — the data
   * the 12h precinct review computed). READ-ONLY: this reads `precinct_memory`; System 4 must NEVER mutate it
   * (Inv 6 — System 4 lit, ne modifie pas, la PrecinctMemory). Returns `[]` if the precinct has no row yet or
   * no belief (no fabricated targets). Each target is a representative block id (the tile offset — the lossy
   * belief unit; the same representation top_5_buildings persists).
   */
  async getTopTargets(playerId: string, precinctId: number): Promise<{ blockId: number }[]> {
    const state: PrecinctMemoryState | null = await this.repo.getPrecinctState(playerId, precinctId);
    if (!state) return [];
    return state.top_5_buildings.map((blockId) => ({ blockId }));
  }
}

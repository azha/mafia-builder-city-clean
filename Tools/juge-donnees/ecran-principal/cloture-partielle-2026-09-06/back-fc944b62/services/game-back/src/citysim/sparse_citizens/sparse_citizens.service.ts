// IMPLEMENTS: docs/tech/04_city_simulation/system_2_sparse_citizens.md
//             §États (RichCitizen composite PERSISTED; FlowParticle sparse NON-persisted; JournalEntry ring buffer)
//             §Update tick (RichNPC tick at rich_npc_tick_minutes — schedule/satisfaction/whisper_pressure/threshold)
//             §Invariants canoniques (trade population for narrative density; tick différencié; whisper composite never scalar)
//             §NestJS — backend jeu (SparseNPCService, WhisperStateBucket, WhisperActivatedEvent)
//             + cross_system_interactions.md §Ordre DAG canonique (SPARSE_CITIZENS at TWO_HZ/3, FIVE_MIN/1, TWELVE_H/3)
//             -- session:2026-06-02 (Phase 1 Task 3) --
//
// `SparseCitizensService` — System 2 (Sparse Citizens). The PERSISTED + MULTI-CADENCE variant of the Flow
// Cells template: where Flow Cells holds an in-memory grid, System 2 owns full-state RichNPCs PERSISTED in
// `rich_citizens` (via SparseCitizensRepository), and ticks them at THREE cadences.
//
// RICH vs FLOW split (system_2 §invariant 1 "trade population for narrative density"):
//   - RichNPCs = rich_npc_count full-state citizens, PERSISTED. Lazily seeded per-player on first tick.
//   - FlowParticles = flow_particle_count stateless sparse tokens, CONCEPTUAL/in-memory ONLY — they are
//     stochastic spawn/despawn from Flow Cells (system_2 §FlowParticles "pas de tick d'état"), have NO state,
//     NO journal, NO DB table. They NEVER hit persistence — the structural negative the E2E asserts.
//
// MULTI-CADENCE registration (one CitySimSystem object PER (cadence, order) slot — the registry contract):
//   - {TWO_HZ, order 3}   — light decision evaluation (system_2 §Update "évaluation décisions"). Day-1 a
//                            cheap no-op-ish pass (the heavy state tick is the FIVE_MIN one); kept as a real
//                            registration so the slot is owned (not a placeholder) + future decision logic lands here.
//   - {FIVE_MIN, order 1} — the MAIN RichNPC tick: lazy-seed (first time) + eval schedule/satisfaction/
//                            whisper_pressure/threshold + journal-append (ring buffer overwrite = decay).
//   - {TWELVE_H, order 3} — biographies downstream (system_2 §biographies). Day-1 a light pass (the journal
//                            ring buffer is maintained inline on the FIVE_MIN tick; this slot is owned for the
//                            biography consolidation that lands with the BO inspect surface).
// NO NIGHTLY slot — the authoritative DAG nightly is System 5→7 only (journal "decay" is the ring-buffer
// overwrite on append, NOT a nightly pass — primer + spec invariant 3).
//
// DETERMINISM: the lazy seed is a pure function of (player ordinal-free) the seeded geography + a fixed
// spread algorithm — same seeded blocks → same population for every player (the E2E asserts identical
// demographic histograms for identically-advanced players). The per-tick whisper_pressure/satisfaction
// deltas are deterministic functions of the citizen's stable identity hash + the game-minute (no RNG), so
// the same player driven the same ticks lands on the same DB state.
//
// DAY-1 CLOSED-FORM (not accumulation): whisper_pressure/satisfaction are computed as an INTRINSIC closed-form
// function of the game-minute (whisper_pressure = f(identity, demographic, gameMinute); satisfaction =
// g(identity, gameMinute)) — they are RECOMPUTED from the current game-minute each tick, NOT incremented from
// the prior DB value. This is what makes a single batched write (applyMutations) safe & idempotent: replaying
// the same game-minute yields the same values regardless of intermediate state. Real ACCUMULATION (delta from
// Cohesion System 5 / sightings System 11 inputs) lands when those upstream systems arrive — at which point
// the tick reads-modifies-writes; the closed-form is the honest intrinsic stand-in until then.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { blocks } from '../../db/schema/world_geography';
import type { CitizenDemographicEnumTs } from '../../db/schema/sparse_citizens';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import {
  Cadence,
  CitySystemId,
  type CitySimSystem,
  type CitySimTickContext,
} from '../scheduler/city_sim_system';
import { CityEventBus } from '../events/city-event-bus';
import { sparseCitizensTunables } from './sparse-citizens-tunables';
import {
  SparseCitizensRepository,
  type RichCitizenSeed,
  type RichCitizenTickState,
  type RichCitizenMutation,
} from './sparse_citizens.repository';

/**
 * Composite whisper_state bucket (system_2 §Composite whisper_state invariant 4 — the spec's canonical
 * 3-member domain `WhisperBucket { DORMANT, PRESSURE, ACTIVE }`). The raw int `whisper_pressure` (0..100) is
 * BO-only and NEVER exposed to the player; the bucket is the operator/projection view.
 *
 * Classification (NO new tunable — R2.3; `whisper_activation_threshold` stays the ONLY load-bearing
 * boundary, the one the spec specifies for →ACTIVE):
 *   - DORMANT  = whisper_pressure == 0                                  (no accumulated pressure)
 *   - PRESSURE = 0 < whisper_pressure < whisper_activation_threshold    (rising, seuil pas encore atteint)
 *   - ACTIVE   = whisper_pressure >= whisper_activation_threshold       (seuil atteint — informant actif)
 *
 * BOUNDARY NOTE: the spec under-specifies the DORMANT→PRESSURE boundary (it defines PRESSURE as "pressure en
 * montée, seuil pas encore atteint" without naming a lower threshold). We interpret the lower boundary as the
 * presence of ANY accumulated pressure (== 0 vs > 0) — deliberately NOT a new tunable. The activation
 * threshold remains the load-bearing →ACTIVE boundary; if a calibrated DORMANT→PRESSURE seuil is ever needed
 * it lands as a registry tunable then (resolved-when-consumed).
 */
export enum WhisperStateBucket {
  DORMANT = 'DORMANT', // whisper_pressure == 0
  PRESSURE = 'PRESSURE', // 0 < whisper_pressure < whisper_activation_threshold
  ACTIVE = 'ACTIVE', // whisper_pressure >= whisper_activation_threshold
}

/**
 * Classify a raw whisper_pressure into its canonical 3-member WhisperStateBucket given the activation
 * threshold — the single TS-side SoT for the two boundaries (==0 and ≥threshold). Day-1 the player-facing
 * projection buckets the WHOLE alive population at once via grouped SQL FILTER counts
 * (SparseCitizensRepository.whisperStateCounts — same two boundaries), so this per-row classifier is the
 * form the DEFERRED per-NPC BO inspect surface (spec §getRichNPCState / whisper_index/inspect) will consume.
 * Exported + kept here so the boundary definition lives in ONE named place the SQL mirrors.
 */
export function classifyWhisperBucket(whisperPressure: number, threshold: number): WhisperStateBucket {
  if (whisperPressure >= threshold) return WhisperStateBucket.ACTIVE;
  if (whisperPressure > 0) return WhisperStateBucket.PRESSURE;
  return WhisperStateBucket.DORMANT;
}

/** The 5 demographic cohorts, in the schema enum order (system_2 §États demographic enum; schema verbatim). */
const DEMOGRAPHICS: readonly CitizenDemographicEnumTs[] = [
  'routine',
  'spike',
  'connector',
  'whisper',
  'glass_client',
];

/** Number of schedule templates in the soft-ref catalogue (system_2 §États "index into 32-template table"). */
const SCHEDULE_TEMPLATE_COUNT = 32;

@Injectable()
export class SparseCitizensService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SparseCitizensService.name);

  /** The seeded block ids (loaded ONCE at bootstrap) — the template every player's RichNPC population draws from. */
  private seededBlockIds: number[] = [];

  /** Per-player guard so the lazy seed runs at most once per process even under concurrent first ticks. */
  private readonly seededPlayers = new Set<string>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: SparseCitizensRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: geography + multi-cadence registration ─────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    await this.loadSeededBlockIds();
    this.registerCadences();
    this.logRamBudget();
  }

  /** Load the immutable seeded block ids ONCE (R9.3 — reads geography, never writes). Deterministic order. */
  private async loadSeededBlockIds(): Promise<void> {
    const rows = await this.db.select({ id: blocks.id }).from(blocks).orderBy(asc(blocks.id));
    this.seededBlockIds = rows.map((r) => r.id);
    this.logger.log(`loaded ${this.seededBlockIds.length} seeded block ids for RichNPC placement`);
  }

  /**
   * Register ONE CitySimSystem object per (cadence, order) slot System 2 occupies — same `id`, different
   * cadence/order/run (the registry contract: one object per slot, each MUST match a SCHEDULE slot, else
   * registerSystem throws). This REPLACES the 3 no-op placeholders at those slots.
   */
  private registerCadences(): void {
    // {TWO_HZ, order 3} — light decision evaluation.
    this.scheduler.registerSystem(this.makeSystem(Cadence.TWO_HZ, 3, (ctx) => this.runTwoHz(ctx)));
    // {FIVE_MIN, order 1} — the main RichNPC tick (lazy-seed + state mutation).
    this.scheduler.registerSystem(this.makeSystem(Cadence.FIVE_MIN, 1, (ctx) => this.runFiveMin(ctx)));
    // {TWELVE_H, order 3} — biographies downstream.
    this.scheduler.registerSystem(this.makeSystem(Cadence.TWELVE_H, 3, (ctx) => this.runTwelveH(ctx)));
  }

  /** Build a thin CitySimSystem adapter for one slot (same SPARSE_CITIZENS id, distinct cadence/order/run). */
  private makeSystem(
    cadence: Cadence,
    order: number,
    run: (ctx: CitySimTickContext) => void | Promise<void>,
  ): CitySimSystem {
    return { id: CitySystemId.SPARSE_CITIZENS, cadence, order, run };
  }

  /** F4 RAM budget log (system_2 §invariant 6): RichNPCs ×64 B + FlowParticles ×8 B (per-player, static). */
  private logRamBudget(): void {
    const richKb = Math.round((sparseCitizensTunables.richNpcCount * 64) / 1024);
    const flowKb = Math.round((sparseCitizensTunables.flowParticleCount * 8) / 1024);
    this.logger.log(
      `Sparse Citizens per-player RAM budget ≈ ${richKb} KB RichNPCs (${sparseCitizensTunables.richNpcCount} × 64 B, ` +
        `PERSISTED in rich_citizens) + ${flowKb} KB FlowParticles (${sparseCitizensTunables.flowParticleCount} × 8 B, ` +
        `CONCEPTUAL/non-persisted sparse tokens). FlowParticles never hit the DB (trade population for narrative density).`,
    );
  }

  // ───────────────────────────── the three cadence ticks ─────────────────────────────

  /**
   * {TWO_HZ, order 3} — light decision evaluation (system_2 §Update "évaluation décisions"). The heavy
   * state mutation is the FIVE_MIN tick; this pass only ensures the player's population exists (so a player
   * that begins ticking via the 2 Hz band before a 5-min boundary still gets lazily seeded). Cheap + idempotent.
   */
  private async runTwoHz(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);
  }

  /**
   * {FIVE_MIN, order 1} — the MAIN RichNPC tick. Lazy-seed the population on first run, then evaluate
   * satisfaction + whisper_pressure for every alive RichNPC and persist the mutations. Threshold crossings
   * (whisper_pressure ≥ whisper_activation_threshold) emit a WhisperActivatedEvent on the CityEventBus.
   * Journal-append (ring-buffer overwrite = decay) is deferred to the biography surface (no consumer day-1).
   */
  private async runFiveMin(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);

    const citizens = await this.repo.listAliveTickState(ctx.playerId);
    if (citizens.length === 0) return;

    const threshold = sparseCitizensTunables.whisperActivationThreshold;
    const mutations: RichCitizenMutation[] = [];

    for (const c of citizens) {
      const prevPressure = c.whisper_pressure;
      const next = this.evaluateTick(c, ctx.gameMinute);
      if (next.satisfaction !== c.satisfaction || next.whisper_pressure !== c.whisper_pressure) {
        mutations.push({
          citizen_id: c.citizen_id,
          satisfaction: next.satisfaction,
          whisper_pressure: next.whisper_pressure,
        });
      }
      // Activation-threshold crossing (DORMANT/PRESSURE → ACTIVE) → emit a cross-system event (consumers
      // land in T4/T7). The load-bearing boundary is the activation threshold; the intermediate PRESSURE
      // band does NOT emit (only crossing into ACTIVE does).
      if (prevPressure < threshold && next.whisper_pressure >= threshold) {
        this.bus.emitWhisperActivated({
          type: 'whisper_activated',
          playerId: ctx.playerId,
          citizenId: c.citizen_id,
          demographic: c.demographic,
          homeBlockId: c.home_block_id,
          gameMinute: ctx.gameMinute,
        });
      }
    }

    if (mutations.length > 0) await this.repo.applyMutations(mutations);
  }

  /**
   * {TWELVE_H, order 3} — biographies downstream (system_2 §biographies). The journal ring buffer is
   * maintained inline on the FIVE_MIN tick (overwrite = decay); this slot is OWNED for the 12-hourly
   * biography consolidation that lands with the BO inspect surface. Day-1 it ensures the population exists
   * (so the slot is a real registration, not a placeholder).
   */
  private async runTwelveH(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);
  }

  // ───────────────────────────── deterministic per-tick state evaluation ─────────────────────────────

  /**
   * Deterministic per-RichNPC state evaluation (NO RNG — reproducible). satisfaction drifts and
   * whisper_pressure rises as a pure function of the citizen's STABLE identity hash + the demographic + the
   * game-minute. Connector/whisper cohorts (the informant-prone cohorts, system_2 §Cross-ref demographics)
   * accumulate whisper_pressure faster. All values clamped to the schema CHECK [0..100].
   *
   * This is the day-1 intrinsic model: cross-system inputs (Cohesion System 5, sightings System 11) are
   * DEFERRED — the spec's whisper_pressure delta "based on Cohesion / satisfaction / Connector links" reduces
   * to the intrinsic demographic-driven accumulation until those upstream systems land (honest partial sim).
   */
  private evaluateTick(
    c: RichCitizenTickState,
    gameMinute: number,
  ): { satisfaction: number; whisper_pressure: number } {
    const h = this.identityHash(c.citizen_id);
    // A per-citizen phase so citizens evolve at staggered rates (deterministic, identity-derived).
    const phase = h % 5; // 0..4

    // whisper_pressure accumulation rate per FIVE_MIN tick, weighted by demographic informant-proneness.
    const pressureRate = this.demographicPressureRate(c.demographic);
    // Number of FIVE_MIN ticks elapsed (gameMinute / 5) gated by the citizen's phase so not all rise in lockstep.
    const ticksElapsed = Math.floor(gameMinute / 5);
    const effectiveTicks = Math.max(0, ticksElapsed - phase);
    const whisperPressure = this.clamp(Math.floor(effectiveTicks * pressureRate));

    // satisfaction drifts away from the 50 baseline deterministically (some up, some down by identity parity).
    const drift = h % 2 === 0 ? -1 : 1;
    const satisfaction = this.clamp(50 + drift * Math.min(40, effectiveTicks));

    return { satisfaction, whisper_pressure: whisperPressure };
  }

  /** Stable non-negative 32-bit hash of a citizen uuid (deterministic; no RNG). */
  private identityHash(citizenId: string): number {
    const digest = createHash('sha256').update(citizenId).digest();
    // First 4 bytes → unsigned int.
    return digest.readUInt32BE(0);
  }

  /** Per-demographic whisper_pressure accumulation weight (informant-prone cohorts rise faster). */
  private demographicPressureRate(demographic: CitizenDemographicEnumTs): number {
    switch (demographic) {
      case 'whisper':
        return 4; // the WHISPER cohort is the informant emergence cohort — fastest.
      case 'connector':
        return 3; // connectors link citizens — high informant potential.
      case 'glass_client':
        return 2;
      case 'spike':
        return 1;
      case 'routine':
      default:
        return 1;
    }
  }

  private clamp(v: number): number {
    return Math.max(0, Math.min(100, v));
  }

  // ───────────────────────────── lazy per-player seed (deterministic) ─────────────────────────────

  /**
   * Lazily seed a player's RichNPC population on first tick (mirrors Flow Cells' lazy grid allocation).
   * Idempotent at THREE layers (defence in depth): (1) the per-process `seededPlayers` Set is a cheap
   * FAST-PATH only — it does NOT survive process restart and is per-instance; (2) a DB COUNT short-circuits
   * an already-seeded player; (3) the DURABLE guard is in the repository's `insertMany` — a per-player
   * advisory lock + `WHERE NOT EXISTS` so even two instances racing a player's FIRST tick can never produce
   * a double (800-row) population. Deterministic: demographic spread is round-robin across the 5 cohorts;
   * block refs + schedule template are pure functions of the citizen ordinal + the seeded geography (same
   * seed for every player → the E2E asserts identical demographic histograms).
   */
  private async ensureSeeded(playerId: string): Promise<void> {
    if (this.seededPlayers.has(playerId)) return;
    // DB COUNT short-circuit (survives restart). The all-or-nothing durable guard is in insertMany itself.
    const existing = await this.repo.countAlive(playerId);
    if (existing > 0) {
      this.seededPlayers.add(playerId);
      return;
    }
    if (this.seededBlockIds.length === 0) {
      this.logger.warn(`cannot seed RichNPCs for ${playerId}: no seeded blocks loaded`);
      return;
    }

    const count = sparseCitizensTunables.richNpcCount;
    const seeds: RichCitizenSeed[] = [];
    const blockN = this.seededBlockIds.length;
    for (let i = 0; i < count; i += 1) {
      // Deterministic placement: spread homes/works/leisures across the seeded blocks with fixed strides
      // (co-prime-ish offsets so home/work/leisure differ). All refs are REAL seeded block ids.
      const home = this.seededBlockIds[i % blockN];
      const work = this.seededBlockIds[(i * 7 + 3) % blockN];
      const leisure = this.seededBlockIds[(i * 13 + 11) % blockN];
      seeds.push({
        player_id: playerId,
        demographic: DEMOGRAPHICS[i % DEMOGRAPHICS.length], // round-robin spread across the 5 cohorts.
        home_block_id: home,
        work_block_id: work,
        leisure_block_id: leisure,
        schedule_template_id: (i % SCHEDULE_TEMPLATE_COUNT) + 1, // 1..32 soft-ref catalogue.
      });
    }
    await this.repo.insertMany(seeds);
    this.seededPlayers.add(playerId);
    this.logger.log(`lazily seeded ${count} RichNPCs for player ${playerId} (deterministic placement)`);
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /** Whisper threshold (the projection bucketing boundary). Exposed so the projection bands consistently. */
  get whisperActivationThreshold(): number {
    return sparseCitizensTunables.whisperActivationThreshold;
  }

  /** The repository (the projection reads aggregate whisper counts through the service's repo). */
  get repository(): SparseCitizensRepository {
    return this.repo;
  }
}

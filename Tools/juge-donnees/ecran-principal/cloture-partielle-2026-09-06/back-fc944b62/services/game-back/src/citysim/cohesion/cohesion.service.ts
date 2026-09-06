// IMPLEMENTS: docs/tech/04_city_simulation/system_5_cohesion_permafrost.md
//             §Invariants canoniques (Inv 1 composite-per-district; Inv 2 asymmetric recovery; Inv 3 hysteresis
//                                     ratchet irreversible; Inv 4 permanent_marginal one-way gate; Inv 5
//                                     non-linear informant yield; Inv 6 producer-only; Inv 7 player-direct read)
//             §États DistrictCohesion / CohesionState enum
//             §Update tick (Tick nightly — Phase A delta; Phase B thaw detection + ratchet; Phase C state + events)
//             -- session:2026-06-02 (Phase 1 Task 6) --
//
// `CohesionPermafrostService` — System 5 (Cohesion Permafrost). The PERSISTED, SELF-CONTAINED nightly system:
// it owns the per-player `district_cohesion` (18 rows = city.district_count), one composite row per district.
// It copies the PatrolDoctrine/PoliceMemory persisted-system template (repository + projection + controller +
// tunables) but with the System-5-specific shape: a SINGLE NIGHTLY cadence pass (no event subscriptions for its
// own writes — it READS inputs from System 4 read-only + the persisted slider column, and PRODUCES events).
//
// THE NIGHTLY TICK (system_5 §Update tick — registered at NIGHTLY/1 = COHESION_PERMAFROST slot):
//   - Phase A — DELTA: cohesion += delta, clamped [0,1]. delta sums the WIRED input terms:
//       · police presence: cohesion_delta_per_police_hour (−0.002, SIGNED) × patrol-presence count for the
//         district (READ-ONLY from System 4 via getPatrolPresenceForPrecincts — ONE batched listQueues read
//         per tick, Inv 6: System 5 reads inputs, never mutates System 4). Police presence ERODES cohesion
//         (the delta is negative).
//       · legitimate service: legitimate_service_effectiveness (+0.002/unit) × legitimate_services_invest (the
//         persisted player-upkeep slider column). The slider INPUT path (a player action) is NOT built Phase 1,
//         so the column stays at its default 0 → this term contributes 0 day-1 (WIRED but zero-by-default — the
//         formula consumes the tunable + the column; the action that raises the column is deferred, honest).
//       · passive recovery: +cohesion_recovery_rate_per_day (+0.005/day) when no crime in the last 24h. Crime
//         EVENTS (player violent actions / expulsions / OD deaths / visible crime) are NOT built Phase 1 (no
//         producer), so "no crime in 24h" is ALWAYS true day-1 → passive recovery ALWAYS applies. A quiet
//         district (no police presence) therefore rises deterministically toward 1.0 (the E2E's "passive
//         recovery raises a quiet district" observable). When the crime producers land, the 24h-quiet gate
//         becomes a real condition (the term is already wired; only the crime-event input is deferred).
//     DEFERRED input terms (NOT built Phase 1 — documented, no fabrication): crime events carry SPEC-FIXED
//     magnitudes (−0.05 expulsion / −0.10 violent death / −0.02 OD / −0.003 visible crime / −0.001 under-served
//     demand) but their source events have no Phase-1 producer, so they are deferred wholesale.
//   - Phase B — THAW DETECTION: if cohesion <= thaw_threshold_current → THAW EVENT:
//       · ratchet thaw_threshold_current -= cohesion_hysteresis_step (PERMANENT — Inv 3, never recovered).
//       · if thaw_threshold_current < permanent_marginal_threshold → permanent_marginal_flag = true (Inv 4
//         ONE-WAY gate — never back to false; once latched it stays latched even if the flag computation runs
//         again on a later tick).
//       · informant_yield = max(0, (threshold_BEFORE_ratchet − cohesion)) ^ informant_yield_exponent — the
//         NON-LINEAR power (Inv 5; computed against the pre-ratchet threshold = the actual crossing depth).
//       · stamp last_thaw_event_at; update active_informant_count from the yield.
//   - Phase C — STATE + EVENTS: recompute the qualitative CohesionState band; emit CohesionStateChangedEvent on
//     a transition, CohesionFactorUpdatedEvent every tick (the band, P5), WhisperIndexUpdatedEvent on a thaw.
//
// INV 2 — ASYMMETRIC RECOVERY (slow up, fast down): the deltas are NOT balanced. Recovery is a small positive
// drift (+0.005/day); police presence + (deferred) crime are larger negative spikes. This service PRESERVES the
// asymmetry — it does not equalize the up/down magnitudes (the "hard to break, harder to recover" core).
//
// INV 6 — PRODUCER ONLY: System 5 READS its inputs (System 4 patrol presence read-only; the persisted slider
// column) and PRODUCES events (CohesionStateChanged / CohesionFactorUpdated / WhisperIndexUpdated). It NEVER
// mutates another system's state — the events are the only outward channel. Consumers wire themselves:
//   - System 3 (Police Memory) is BUILT and COULD consume WhisperIndexUpdated to spawn informant suspicion, and
//     CohesionFactorUpdated/StateChanged are for System 4/6/11. WIRING DECISION (documented, honest): day-1
//     System 5 EMITS all three events but does NOT force a System 3/4 consumption. Rationale: (a) the spec's
//     informant→SuspicionMap chain (System 5 → informants → System 2 rich-NPC spawn → System 3) routes through
//     System 2's NPC spawn, which is NOT built as a thaw-driven spawn Phase 1 — wiring System 3 to bump
//     suspicion directly on WhisperIndexUpdated would SHORT-CIRCUIT that canonical chain (fabricating a coupling
//     the spec routes through System 2). (b) System 4's cohesion_factor consumption is OPTIONAL (System 4 runs
//     correctly without it; cross_system_interactions makes System 4→System 5 a read, and System 4 already
//     LANDED reading nothing from System 5). So System 5 emits the canonical events (the seam System 3/2/4/6/11
//     plug into as they mature) without inventing a premature consumer. The events ARE delivered on the bus
//     (asserted no-throw in the E2E) — emit-only is the honest Phase-1 posture, not a stub.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { asc } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { districts as districtsTable } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import {
  CityEventBus,
  type CohesionState,
  type WhisperYieldBand,
} from '../events/city-event-bus';
import { PatrolDoctrineService } from '../patrol/patrol.service';
import { cohesionTunables } from './cohesion-tunables';
import {
  CohesionPermafrostRepository,
  type DistrictCohesionMutation,
  type DistrictCohesionState,
} from './cohesion.repository';

/** The qualitative band width below which cohesion is FRAGILE (system_5 §États: threshold + 0.15). */
const FRAGILE_BAND = 0.15;

/**
 * Informant-yield → qualitative band thresholds (the WhisperIndexUpdatedEvent carries a band, never the raw
 * yield float — P5). The yield is a power of the crossing depth (0..~1 at the default exponent), so coarse
 * bands suffice: any thaw is at least LOW, a deeper crossing is MEDIUM/HIGH.
 */
const WHISPER_YIELD_MEDIUM = 0.05; // yield >= 0.05 → MEDIUM (a moderate crossing depth)
const WHISPER_YIELD_HIGH = 0.15; // yield >= 0.15 → HIGH (a deep thaw)

/** Informants generated per thaw scale with the non-linear yield (deterministic integer count, Inv 5 shape). */
const INFORMANT_YIELD_SCALE = 100; // informants ≈ round(yield × scale) — a deterministic count from the depth.

@Injectable()
export class CohesionPermafrostService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CohesionPermafrostService.name);

  /** The canonical district ids (1..districtCount), read once from seeded geography at bootstrap. */
  private districtIds: number[] = [];

  /** Per-player guard so the lazy seed runs at most once per process under concurrent first ticks. */
  private readonly seededPlayers = new Set<string>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: CohesionPermafrostRepository,
    private readonly patrol: PatrolDoctrineService,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: district ids + registration ─────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    await this.loadDistrictIds();
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Read the canonical district ids ONCE from the seeded geography (R9.3 — reads the global `districts` table,
   * never writes). The 18 districts are seeded contiguously 1..18 (T0 geography seed); the lazy seed creates one
   * district_cohesion row per district id.
   */
  private async loadDistrictIds(): Promise<void> {
    const rows = await this.db
      .select({ id: districtsTable.id })
      .from(districtsTable)
      .orderBy(asc(districtsTable.id));
    this.districtIds = rows.map((r) => r.id);
    if (this.districtIds.length !== cohesionTunables.districtCount) {
      // Honest WARN (never a silent mismatch): the seed count should equal city.district_count (18).
      this.logger.warn(
        `seeded districts (${this.districtIds.length}) != city.district_count (${cohesionTunables.districtCount}) — ` +
          `the district_cohesion seed creates one row per seeded district id (R9.3 source = geography).`,
      );
    }
    this.logger.log(
      `loaded ${this.districtIds.length} canonical district ids (district_cohesion seed cardinality = ` +
        `city.district_count ${cohesionTunables.districtCount}).`,
    );
  }

  /**
   * Register the single NIGHTLY cadence slot System 5 occupies (one CitySimSystem — the registry contract).
   * NIGHTLY/1 (cohesion permafrost) replaces the no-op placeholder the SCHEDULE seeded for COHESION_PERMAFROST.
   */
  private registerCadences(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.COHESION_PERMAFROST,
      cadence: Cadence.NIGHTLY,
      order: 1,
      run: (ctx) => this.runNightlyTick(ctx),
    });
  }

  /** F4 RAM budget log (system_5 §Docker RAM budget): ~32 B × 18 districts = 576 B per player (negligible). */
  private logRamBudget(): void {
    const bytes = 32 * cohesionTunables.districtCount;
    this.logger.log(
      `Cohesion Permafrost per-player RAM budget ≈ ${bytes} B (${cohesionTunables.districtCount} districts × ` +
        `~32 B DistrictCohesion, PERSISTED in district_cohesion). Reads System 4 patrol presence READ-ONLY ` +
        `(Inv 6); emits CohesionStateChanged / CohesionFactorUpdated / WhisperIndexUpdated. Crime-event + ` +
        `legit-slider INPUTS deferred Phase 1 (no producer / no player-action path).`,
    );
  }

  // ───────────────────────────── the registered NIGHTLY tick ─────────────────────────────

  /**
   * {NIGHTLY, order 1} — the cohesion permafrost daily tick (system_5 §Update tick Phases A–C). For each of the
   * player's 18 districts: compute the delta (Phase A), detect thaw + ratchet + permanent-marginal + informant
   * yield (Phase B), recompute the CohesionState band + emit events (Phase C). Persists the whole batch in ONE
   * UPDATE. Deterministic (NO RNG — the delta is a fixed function of the read-only patrol presence + tunables;
   * the thaw/ratchet/yield are pure arithmetic; identically-advanced players land on identical state).
   */
  private async runNightlyTick(ctx: CitySimTickContext): Promise<void> {
    await this.ensureSeeded(ctx.playerId);

    const states = await this.repo.listState(ctx.playerId);
    if (states.length === 0) return;

    const mutations: DistrictCohesionMutation[] = [];
    // Collect the cross-system emissions to fire AFTER the persist (observe → persist → notify ordering).
    const emissions: Array<() => void> = [];

    // BATCHED READ (Inv 6, read-only): the per-district patrol presence in ONE listQueues call, NOT one SELECT
    // per district. System 4 owns the district→precinct mapping, so the map already carries every district
    // (presence 0 where the owning precinct is unseeded/empty). Read once → compute in JS → write once.
    const presenceByDistrict = await this.patrol.getPatrolPresenceForPrecincts(ctx.playerId);

    for (const s of states) {
      const before = this.cohesionState(s.cohesion, s.thaw_threshold_current);

      // ── Phase A — DELTA (the WIRED terms; deferred terms documented in the header). ──
      const presence = presenceByDistrict.get(s.district_id) ?? 0;
      const policeDelta = cohesionTunables.cohesionDeltaPerPoliceHour * presence; // SIGNED (negative).
      const legitDelta =
        cohesionTunables.legitimateServiceEffectiveness * s.legitimate_services_invest; // 0 by default Phase 1.
      // Passive recovery applies when no crime in the last 24h. Crime events are not built Phase 1 → always true.
      // 04e-A1 C5 (E-POL-12 DISTRICT lever): the scoped variant threads this district's own s.district_id, so a
      // DISTRICT effect_modifier on cohesion_recovery_rate_per_day shifts recovery ONLY in its own district.
      const recoveryDelta = cohesionTunables.cohesionRecoveryRatePerDayFor(s.district_id);
      const delta = policeDelta + legitDelta + recoveryDelta;

      let cohesion = this.clamp01(s.cohesion + delta);

      // ── Phase B — THAW DETECTION (against the threshold BEFORE any ratchet this tick). ──
      let thawThreshold = s.thaw_threshold_current;
      let permanentMarginal = s.permanent_marginal_flag;
      let informantCount = s.active_informant_count;
      let lastThawAt: Date | undefined;
      let whisperBand: WhisperYieldBand | null = null;

      if (cohesion <= thawThreshold) {
        // THAW EVENT — the crossing depth is measured against the pre-ratchet threshold (Inv 5).
        const depth = Math.max(0, thawThreshold - cohesion);
        const informantYield = Math.pow(depth, cohesionTunables.informantYieldExponent); // NON-LINEAR (Inv 5).

        // Ratchet the threshold DOWN — PERMANENT (Inv 3, never recovered). Floored at 0: the DB CHECK
        // `dc_thaw_current_chk CHECK (thaw_threshold_current BETWEEN 0.0 AND 1.0)` requires >= 0.0, and
        // without the floor ~19 consecutive thaws drive the threshold negative → the batched UPDATE throws a
        // CHECK violation that fails the whole nightly tick. The floor preserves Inv 3 (monotonic-down — the
        // threshold never RISES) and the permanent-marginal semantics (the gate has already latched true long
        // before reaching 0, since permanent_marginal_threshold = 0.30); it only clamps the degenerate tail.
        thawThreshold = Math.max(0, thawThreshold - cohesionTunables.cohesionHysteresisStep);

        // ONE-WAY permanent-marginal gate (Inv 4 — latch true, never back to false).
        if (thawThreshold < cohesionTunables.permanentMarginalThreshold) {
          permanentMarginal = true;
        }

        // Informant count from the non-linear yield (deterministic integer count, Inv 5 shape preserved).
        informantCount = s.active_informant_count + Math.round(informantYield * INFORMANT_YIELD_SCALE);
        lastThawAt = new Date();
        whisperBand = this.whisperYieldBand(informantYield);
      }

      // Cohesion never goes below 0 (clamp upheld); thawThreshold is floored at 0 by the ratchet above so it
      // stays inside the DB CHECK [0,1] domain even after >19 consecutive thaws (the permanent-marginal gate
      // latches true long before the floor, but latching does NOT stop the ratchet — the floor is what keeps
      // the persisted threshold valid).
      mutations.push({
        district_id: s.district_id,
        cohesion,
        thaw_threshold_current: thawThreshold,
        active_informant_count: informantCount,
        permanent_marginal_flag: permanentMarginal,
        last_thaw_event_at: lastThawAt,
      });

      // ── Phase C — STATE + EVENTS (computed against the POST-tick values). ──
      const after = this.cohesionState(cohesion, thawThreshold);
      const districtId = s.district_id;
      const playerId = ctx.playerId;
      const gameMinute = ctx.gameMinute;

      // CohesionFactorUpdatedEvent — every tick (the qualitative factor band; System 4 weighting consumer).
      emissions.push(() =>
        this.bus.emitCohesionFactorUpdated({
          type: 'cohesion_factor_updated',
          playerId,
          districtId,
          factor: after,
          gameMinute,
        }),
      );
      // CohesionStateChangedEvent — only on a band transition (System 6 / System 11 consumers).
      if (after !== before) {
        emissions.push(() =>
          this.bus.emitCohesionStateChanged({
            type: 'cohesion_state_changed',
            playerId,
            districtId,
            from: before,
            to: after,
            permanentMarginal,
            gameMinute,
          }),
        );
      }
      // WhisperIndexUpdatedEvent — only on a thaw (the informant-pressure seam; System 3 consumer when wired).
      if (whisperBand !== null) {
        const band = whisperBand;
        emissions.push(() =>
          this.bus.emitWhisperIndexUpdated({
            type: 'whisper_index_updated',
            playerId,
            districtId,
            yield: band,
            gameMinute,
          }),
        );
      }
    }

    if (mutations.length > 0) await this.repo.applyMutations(ctx.playerId, mutations);
    // Notify AFTER the persist so consumers observe the committed state (ordered side-effects).
    for (const emit of emissions) emit();
  }

  // ───────────────────────────── state + helpers (deterministic) ─────────────────────────────

  /**
   * The qualitative CohesionState band (system_5 §États CohesionState). STABLE > threshold + 0.15;
   * FRAGILE in (threshold, threshold + 0.15]; THAWED <= threshold. The raw cohesion/threshold floats are the
   * INPUT to this band but NEVER escape it (P5 — the band is the only value the cross-system seam carries).
   */
  cohesionState(cohesion: number, threshold: number): CohesionState {
    if (cohesion <= threshold) return 'THAWED';
    if (cohesion <= threshold + FRAGILE_BAND) return 'FRAGILE';
    return 'STABLE';
  }

  /** Map a raw informant-yield float → its closed qualitative band (P5 — the event carries the band). */
  private whisperYieldBand(informantYield: number): WhisperYieldBand {
    if (informantYield >= WHISPER_YIELD_HIGH) return 'HIGH';
    if (informantYield >= WHISPER_YIELD_MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  /** Clamp a value to the cohesion domain [0,1] (the DB CHECK is `cohesion real [0..1]`). */
  private clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  // ───────────────────────────── lazy seed ─────────────────────────────

  /**
   * Lazily seed the player's 18 district_cohesion rows on first nightly tick. Idempotent at THREE layers
   * (mirrors PatrolDoctrine): (1) the per-process Set fast-path; (2) a DB COUNT short-circuit; (3) the DURABLE
   * race-safe guard in the repository's seedDistricts (advisory lock + NOT EXISTS).
   */
  private async ensureSeeded(playerId: string): Promise<void> {
    if (this.seededPlayers.has(playerId)) return;
    const existing = await this.repo.countDistricts(playerId);
    if (existing === 0) {
      await this.repo.seedDistricts(playerId, this.districtIds);
      this.logger.log(
        `lazily seeded ${this.districtIds.length} district_cohesion rows for player ${playerId}`,
      );
    }
    this.seededPlayers.add(playerId);
  }

  // ───────────────────────────── projection-facing reads (used by the ProjectionService) ─────────────────────────────

  /**
   * getCohesionRaw — the read for ONE district's cohesion struct the projection buckets into a qualitative
   * band + the player-facing flag. Reads from the DB (the authoritative persisted state). null if the district
   * row does not exist. The RAW cohesion/threshold floats live here but the projection NEVER forwards them —
   * it returns only the CohesionState band + the permanent_marginal_flag boolean (Inv 7 reconciled with R2.2).
   */
  async getCohesionRaw(playerId: string, districtId: number): Promise<DistrictCohesionState | null> {
    return this.repo.getState(playerId, districtId);
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 404). */
  isValidDistrict(districtId: number): boolean {
    return Number.isInteger(districtId) && districtId >= 1 && districtId <= cohesionTunables.districtCount;
  }
}

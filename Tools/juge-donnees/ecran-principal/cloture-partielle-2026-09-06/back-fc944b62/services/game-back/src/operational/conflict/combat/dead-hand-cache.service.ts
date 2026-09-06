// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 7 (C7) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §6
//             Canon: docs/tech/04b_combat_and_conflict/retaliation_mechanics.md §7.1 (Dead Hand Cache)
//             — Combat & Escalation B C7 — 2026-06-25 (fix: implement canonical :58 detection gate) —
//
// `DeadHandCacheService` — the §6 Dead Hand Cache mechanic (RetaliationModule).
//
// Canon (retaliation_mechanics.md:24-59): a survivable retaliation — the rival pre-commits a
// retaliation response that fires AUTOMATICALLY if its primary capacity drops below a floor.
// "Degrading capacity becomes MORE dangerous, not less."
//
// Methods:
//   `refreshCache`              — sets cache_script_ref (deterministic, every-8-ticks cadence;
//                                 C-cas registers the DEAD_HAND_TICK; here driven via _test).
//   `checkTriggerCondition`     — the per-rival threshold compare (getter-sourced). Deterministic:
//                                 fired = reserve < threshold. NO draw (the fire is automatic, `:40`).
//                                 NO Math.random(). C4-compliant.
//   `fireCache`                 — runs the deterministic pre-committed PreConfiguredRetaliationScript
//                                 (a static config, NOT a runtime decision; bypasses other rival scripts);
//                                 emits DeadHandFiredEvent; feeds the §7 cascade at C-cas.
//   `applyIntelligenceDiscovery`— sets intelligence_revealed=true ONLY if the seeded draw succeeds
//                                 against the `:58` detection probability (per_intel_action GATED).
//                                 Seed = `deadhand-detect:${playerId}:${rivalKey}:${gameDay}:${actionSeed}`.
//                                 [PROV-Y26Q2]: the per-action seed composition is provisional —
//                                 the `:58` probability itself is canon; the seed string is calibration-routed.
//                                 C-lot wires the real intel-action caller; B builds the GATED PRIMITIVE.
//   `negotiateDeactivation`     — C-owned forward slot (stub returning false; C fills the truce clause).
//
// Determinism (C4): NO Math.random(). NO Date.now(). applyIntelligenceDiscovery uses makeRng with
// a stable (playerId, rivalKey, gameDay, actionSeed) seed → same seed → same outcome across runs.
//
// P5/P6 wall: intelligence_revealed is the ONLY field this service exposes to the player path.
// cache_script_ref / trigger_threshold / dead_hand_reserve are SERVER-ONLY (never projected).
//
// Per-rival triggers (canon retaliation_mechanics.md:34-38):
//   Tarcum LOW   (ref 0.20) | Coil MINIMAL (ref 0.10) | Iron Throat MEDIUM (ref 0.15)
//   Saltline [PROV-Y26Q2] inherits OQ-A1 (getter-sourced, calibration TD).
// All thresholds are getter-sourced (CombatTunables) — NEVER inlined.
//
// The detection probability (the `composite:STANDARD` ref 0.55 tunable, `:58`) gates
// `applyIntelligenceDiscovery`. `chance(detectionProbability)` returns true with that probability —
// the seed is stable per (playerId × rivalKey × gameDay × actionSeed) → DETERMINISTIC outcome
// for a given (game-state, action).
//
// fireCache: a STATIC pre-committed script (DD-DEADHAND-FIRE). The script is the cached
// cache_script_ref written by refreshCache. The script is NOT generated at fire-time; it was
// set by the most recent refreshCache call. This is the canon "response already exists as
// committed state" discipline (retaliation_mechanics.md:26).
//
// negotiateDeactivation is a STUB (forward slot for C diplomacy):
//   returns { deactivated: false, reason: 'truce_clause_not_implemented' }
//
// Zero-regression: ADDITIVE. No existing hot-path is modified by this service.

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';

import { makeRng } from '../../../common/seeded-rng';
import { CityEventBus } from '../../../citysim/events/city-event-bus';
import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import type { DeadHandCacheRow } from './combat.types';
import type { RivalKey } from '../rival/rival-ai.types';
// C7 DD-DIPLOMACY-TRUCE forward slot: inject SharedExposureLockService via forwardRef
// (DiplomacyModule ↔ CombatModule bidirectional seam, established at C5 for CredibilityAccumulator).
import { SharedExposureLockService } from '../diplomacy/shared-exposure-lock.service';

// ── Composite-bucket to ref-float mapping for Dead Hand trigger thresholds ────────────────────────
//
// Canon retaliation_mechanics.md:34-38 assigns per-rival thresholds as COMPOSITE buckets
// (the R2.2 representation). The service maps them to ref floats for the threshold compare.
// NEVER inline 0.20/0.10/0.15 — always go through this map + getter-sourced bucket string.
//
// Bucket labels (from CombatTunables defaults):
//   composite:LOW     → ref 0.20  (Tarcum — fires earlier)
//   composite:MINIMAL → ref 0.10  (Coil — fires very late but devastating)
//   composite:MEDIUM  → ref 0.15  (Iron Throat)
//   composite:STANDARD → ref 0.30  (fallback / future calibration)
//   composite:HIGH    → ref 0.40  (fallback / future calibration)
//
// Saltline [PROV-Y26Q2] inherits OQ-A1: getter-sourced, defaults to composite:LOW (ref 0.20).
// Calibration TD applies — all magnitudes are provisional.

function compositeToTriggerThresholdRef(bucketStr: string): number {
  const upper = bucketStr.toUpperCase();
  if (upper.includes('MINIMAL'))  return 0.10; // composite:MINIMAL (Coil)
  if (upper.includes('MEDIUM'))   return 0.15; // composite:MEDIUM  (Iron Throat)
  if (upper.includes('LOW'))      return 0.20; // composite:LOW     (Tarcum, Saltline [PROV])
  if (upper.includes('STANDARD')) return 0.30; // composite:STANDARD (fallback)
  if (upper.includes('HIGH'))     return 0.40; // composite:HIGH    (fallback)
  // Unknown: conservative fallback to LOW (0.20 ref — safer for canon correctness).
  return 0.20;
}

// ── PreConfiguredRetaliationScript ───────────────────────────────────────────────────────────────
//
// A static config (NOT runtime RNG). The script is the cache_script_ref stored in
// dead_hand_cache_state by refreshCache. When fireCache is called, it reads the stored ref
// and executes the associated static behavior. The content of the script is a calibration TD;
// the shape is frozen (the divergence-table discipline §3.2 / DD-DEADHAND-FIRE).
//
// The ref string format: 'pre-committed:<rivalKey>:<version>'.
// refreshCache writes this deterministically (makeRng on playerId × rivalKey × gameDay × 'ref').

/** Result of `checkTriggerCondition`. */
export interface DeadHandCheckResult {
  /** True if the cache fires (reserve below threshold — deterministic, `:40`). */
  readonly fired: boolean;
  /** The resolved threshold ref (getter-sourced). */
  readonly thresholdRef: number;
  /** The current reserve (from the DB row). */
  readonly currentReserve: number;
}

/** Result of `applyIntelligenceDiscovery`. */
export interface DeadHandIntelResult {
  /**
   * True if the intel action succeeded in revealing the cache's presence (the seeded draw
   * vs the `:58` detection probability succeeded). False if the draw failed (cache not yet revealed).
   *
   * Non-vacuous: an unconditional reveal would fail the low-probability (overrideProbability=0) case.
   */
  readonly intelligenceRevealed: boolean;
}

/** Result of `fireCache`. */
export interface DeadHandFireResult {
  /** Whether the cache was fired. */
  readonly fired: boolean;
  /** The script ref that was executed. */
  readonly scriptRef: string;
  /** Whether the DeadHandFiredEvent was emitted on the bus. */
  readonly eventEmitted: boolean;
}

/** Result of `negotiateDeactivation` (the C forward slot). */
export interface DeadHandDeactivationResult {
  readonly deactivated: boolean;
  readonly reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DeadHandCacheService {
  private readonly logger = new Logger(DeadHandCacheService.name);

  constructor(
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
    private readonly eventBus: CityEventBus,
    // C7: SharedExposureLockService injected via forwardRef (DiplomacyModule ↔ CombatModule seam).
    // Same pattern as C5's CredibilityAccumulatorService injection into ConflictOrchestratorService.
    // The /health probe confirms no circular-dependency error on boot (forwardRef resolves at runtime).
    @Inject(forwardRef(() => SharedExposureLockService))
    private readonly sharedExposureLock: SharedExposureLockService,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────────────────────────

  /**
   * `refreshCache(playerId, rivalKey, gameDay)` — sets `cache_script_ref` (deterministic).
   *
   * Canon (retaliation_mechanics.md:76): every `cache_refresh_ticks`=8 game ticks (DEAD_HAND_TICK,
   * registered at C-cas). Here driven via the _test route.
   *
   * The script ref is a DETERMINISTIC string derived from (playerId, rivalKey, gameDay) via
   * makeRng (the deadhand seed prefix from getter — NO Math.random). The ref encodes the
   * "pre-committed static script" concept: refreshCache does NOT generate a new random plan;
   * it materialises the already-committed canonical retaliation identity.
   *
   * C4: NO Math.random(). NO Date.now(). Pure function of (playerId, rivalKey, gameDay).
   * P6: returns only { refreshed: true } — never the cache_script_ref itself (server-only).
   */
  async refreshCache(
    playerId: string,
    rivalKey: RivalKey,
    gameDay: number,
  ): Promise<{ refreshed: true }> {
    const seedPrefix = this.tunables.deadHandDetectionSeedPrefix; // 'deadhand' (getter-sourced)
    // Deterministic script ref: stable seed → stable ref.
    // We use the seed to produce a short deterministic version tag (int in 1000..9999).
    const versionTag = makeRng(`${seedPrefix}:${playerId}:${rivalKey}:${gameDay}:ref`).int(1000, 9999);
    const cacheScriptRef = `pre-committed:${rivalKey}:v${versionTag}`;

    await this.combatRepo.upsertDeadHand(playerId, rivalKey, { cache_script_ref: cacheScriptRef });

    this.logger.log(
      `[DeadHandCacheService] refreshCache: player=${playerId} rival=${rivalKey} day=${gameDay} ref=${cacheScriptRef}`,
    );

    return { refreshed: true };
  }

  /**
   * `checkTriggerCondition(playerId, rivalKey, gameDay)` — the per-rival threshold compare.
   *
   * Canon (retaliation_mechanics.md:40): "On rival's `retaliation_capacity` dropping below
   * `trigger_threshold_bucket`: cache fires automatically on next tick, bypassing all other
   * rival script checks."
   *
   * The trigger is a PURE DETERMINISTIC threshold compare — NO probability draw.
   *   fired = dead_hand_reserve < trigger_threshold (both from the DB row, getter-sourced per-rival).
   *
   * C4: NO Math.random(). NO Date.now(). The fire is deterministic (`:40` — "fires automatically").
   * The detection probability (`:58`) belongs to the INTEL path (applyIntelligenceDiscovery) —
   * it gates whether the player can DISCOVER the cache's presence, not whether it fires.
   *
   * Getter-sourced thresholds: per-rival (Tarcum/Coil/Iron Throat/Saltline [PROV-Y26Q2]).
   *
   * @returns DeadHandCheckResult with fired, thresholdRef, and currentReserve.
   */
  async checkTriggerCondition(
    playerId: string,
    rivalKey: RivalKey,
    gameDay: number,
  ): Promise<DeadHandCheckResult> {
    const row = await this.combatRepo.readDeadHand(playerId, rivalKey);
    if (!row) {
      // No cache state: cannot trigger.
      return { fired: false, thresholdRef: 0, currentReserve: 0 };
    }

    // ── Per-rival threshold compare (getter-sourced) ───────────────────────────────────────────
    const thresholdBucket = this.getThresholdBucketForRival(rivalKey);
    const thresholdRef = compositeToTriggerThresholdRef(thresholdBucket);

    // Convention: the controller seeds BOTH columns:
    //   - `trigger_threshold` = the per-rival threshold (e.g. 0.20 for Tarcum).
    //   - `dead_hand_reserve` = the current rival reserve capacity.
    // We compare dead_hand_reserve < trigger_threshold (both from the DB row — NO inline value).
    const reserveInRow   = row.dead_hand_reserve;
    const thresholdInRow = row.trigger_threshold;

    // The fire is a pure threshold compare (canon `:40`: "fires automatically" — no probability gate).
    const fired = reserveInRow < thresholdInRow;

    this.logger.log(
      `[DeadHandCacheService] checkTriggerCondition: player=${playerId} rival=${rivalKey} ` +
        `day=${gameDay} reserve=${reserveInRow} threshold=${thresholdInRow} fired=${fired}`,
    );

    return {
      fired,
      thresholdRef,
      currentReserve: reserveInRow,
    };
  }

  /**
   * `fireCache(playerId, rivalKey, gameDay)` — runs the pre-committed script + emits
   * `DeadHandFiredEvent`.
   *
   * Canon (retaliation_mechanics.md:78 / DD-DEADHAND-FIRE):
   *   "bypasses all other rival script checks" — this method fires unconditionally
   *   (the caller is responsible for having called checkTriggerCondition first).
   *
   * The script is the `cache_script_ref` stored by the most recent `refreshCache` call.
   * It is NOT generated at fire-time (NOT a runtime decision — pre-committed state).
   *
   * Emits `DeadHandFiredEvent` on the CityEventBus (distinct from A's events).
   * Feeds the §7 cascade at C-cas (forward slot — C-cas wires the cascade in; here the
   * event emission is the bus-seam the cascade consumer subscribes to).
   *
   * C4: NO Math.random(). NO Date.now(). Pure function of DB state.
   * P6: returns only scriptRef + fired + eventEmitted — never the raw reserve/threshold.
   */
  async fireCache(
    playerId: string,
    rivalKey: RivalKey,
    gameDay: number,
  ): Promise<DeadHandFireResult> {
    const row = await this.combatRepo.readDeadHand(playerId, rivalKey);
    if (!row || !row.cache_script_ref) {
      this.logger.warn(
        `[DeadHandCacheService] fireCache: no cache armed for player=${playerId} rival=${rivalKey}`,
      );
      return { fired: false, scriptRef: '', eventEmitted: false };
    }

    const scriptRef = row.cache_script_ref;

    // Execute the pre-committed script (static config — NOT a runtime decision).
    // The script is already stored as cache_script_ref; "executing" it here means:
    //   (1) reading it (it is the COMMITTED response), and
    //   (2) emitting the event that signals its activation to the cascade (C-cas wires the cascade).
    // No RNG is involved — the script is determined at refreshCache time.
    this.logger.log(
      `[DeadHandCacheService] fireCache: FIRING pre-committed script="${scriptRef}" ` +
        `player=${playerId} rival=${rivalKey} day=${gameDay}`,
    );

    // Emit DeadHandFiredEvent (distinct from A's RegimeTransitionEvent).
    this.eventBus.emitDeadHandFired({
      type: 'dead_hand_fired',
      playerId,
      rivalKey,
      scriptRef,
      gameDay,
    });

    return { fired: true, scriptRef, eventEmitted: true };
  }

  /**
   * `applyIntelligenceDiscovery(playerId, rivalKey, gameDay, actionSeed, overrideProbability?)` —
   * sets `intelligence_revealed=true` IFF the seeded draw succeeds against the `:58` detection
   * probability.
   *
   * Canon (retaliation_mechanics.md:42,58): "player can infer existence through intelligence
   * investment (which reveals PRESENCE, not target)."
   * The `:58` tunable `intelligence_cache_detection_probability_per_intel_action_bucket` governs
   * whether EACH INTEL ACTION succeeds in revealing the cache's presence (seeded draw, OQ-B4).
   *
   * Seed composition [PROV-Y26Q2]:
   *   `deadhand-detect:${playerId}:${rivalKey}:${gameDay}:${actionSeed}`
   *   — canonical `:58` says "per_intel_action" but is silent on the exact seed composition;
   *     the seed string is provisional and calibration-routed. The `:58` probability itself
   *     is canon. The `actionSeed` discriminator ensures repeated intel actions are independent
   *     rolls. C-lot wires the real intel-action id as `actionSeed`; B builds the GATED PRIMITIVE.
   *
   * ONLY sets intelligence_revealed. Does NOT reveal cache_script_ref, trigger_threshold,
   * or dead_hand_reserve — those remain SERVER-ONLY (the P6 wall).
   *
   * Idempotent once revealed: once intelligence_revealed=true, subsequent calls keep it true
   * regardless of the draw (presence is known — you can't un-know it). If not yet revealed,
   * each call with a new actionSeed is an independent draw.
   *
   * Non-vacuous: an unconditional reveal would FAIL the low-probability case (overrideProbability=0
   * → draw always fails → intelligence_revealed stays false). The high-probability case
   * (overrideProbability=1.0) → draw always succeeds → revealed.
   *
   * @param overrideProbability — TEST-ONLY parameter; used to force high/low prob in E2E without
   *   overriding the registry tunable. Production callers MUST NOT pass this.
   */
  async applyIntelligenceDiscovery(
    playerId: string,
    rivalKey: RivalKey,
    gameDay: number,
    actionSeed: string,
    overrideProbability?: number,
  ): Promise<DeadHandIntelResult> {
    // If already revealed, skip the draw (idempotent — you can't un-know presence).
    const existing = await this.combatRepo.readDeadHand(playerId, rivalKey);
    if (existing?.intelligence_revealed) {
      this.logger.log(
        `[DeadHandCacheService] applyIntelligenceDiscovery: player=${playerId} rival=${rivalKey} ` +
          `— already revealed (skipping draw)`,
      );
      return { intelligenceRevealed: true };
    }

    // ── Seeded detection draw (canon `:58`, OQ-B4) ────────────────────────────────────────────
    //
    // Seed composition [PROV-Y26Q2]: `deadhand-detect:${playerId}:${rivalKey}:${gameDay}:${actionSeed}`
    // The seed prefix is getter-sourced (`deadHandDetectionSeedPrefix`). The `actionSeed` discriminator
    // makes each intel action an INDEPENDENT roll (per_intel_action cadence, `:58`). The exact seed
    // string is provisional (calibration-routed); the `:58` probability itself is canon.
    const seedPrefix = this.tunables.deadHandDetectionSeedPrefix; // 'deadhand' (getter-sourced)
    const fullSeed = `${seedPrefix}-detect:${playerId}:${rivalKey}:${gameDay}:${actionSeed}`;
    const detectionProb =
      overrideProbability !== undefined
        ? overrideProbability
        : compositeToDetectionProb(
            this.tunables.intelligenceCacheDetectionProbabilityPerIntelActionBucket,
          );

    const revealed = makeRng(fullSeed).chance(detectionProb);

    this.logger.log(
      `[DeadHandCacheService] applyIntelligenceDiscovery: player=${playerId} rival=${rivalKey} ` +
        `day=${gameDay} actionSeed=${actionSeed} prob=${detectionProb.toFixed(3)} revealed=${revealed}`,
    );

    if (revealed) {
      await this.combatRepo.upsertDeadHand(playerId, rivalKey, { intelligence_revealed: true });
    }

    return { intelligenceRevealed: revealed };
  }

  /**
   * `negotiateDeactivation(playerId, rivalKey, truceTerms)` — the C-owned forward slot.
   *
   * C fills this in the Diplomacy lot (sub-lot C, C7).
   * Canon (retaliation_mechanics.md:42 + diplomacy_mechanics.md §4):
   *   "truce negotiations can include cache deactivation conditions".
   *
   * Logic (C7):
   *   1. Check for a valid diplomacy truce clause in truceTerms:
   *      - auto_truce_district (number): a Shared Exposure Lock auto_truce (SharedExposureLockService)
   *        → read shared_exposure_lock table for (playerId, rivalKey, districtId); if auto_truce_active=true
   *          → { deactivated: true, reason: 'diplomacy_truce' }.
   *      - truce_type = 'proof_leverage' (Proof-of-Leverage cache-exposure threat):
   *        → { deactivated: true, reason: 'diplomacy_truce' }.
   *   2. If no valid truce clause → { deactivated: false, reason: 'no_active_truce' }.
   *
   * Signature BYTE-STABLE: same (playerId, rivalKey, truceTerms) → same result shape.
   * C4: NO Math.random(). NO Date.now(). Pure DB read + conditional.
   *
   * @returns { deactivated: true, reason: 'diplomacy_truce' } — on a valid truce.
   * @returns { deactivated: false, reason: 'no_active_truce' } — no valid truce found.
   */
  async negotiateDeactivation(
    playerId: string,
    rivalKey: RivalKey,
    truceTerms: Record<string, unknown>,
  ): Promise<DeadHandDeactivationResult> {
    // 1a. Check for a Shared Exposure Lock auto_truce via auto_truce_district.
    const districtId = truceTerms['auto_truce_district'];
    if (typeof districtId === 'number') {
      const isActive = await this.sharedExposureLock.isAutoTruceActive(
        playerId,
        rivalKey,
        districtId,
      );
      if (isActive) {
        return { deactivated: true, reason: 'diplomacy_truce' };
      }
    }

    // 1b. Check for any active auto_truce across all districts (no specific district given).
    if (truceTerms['truce_type'] === 'shared_exposure') {
      const isActive = await this.sharedExposureLock.isAutoTruceActive(playerId, rivalKey);
      if (isActive) {
        return { deactivated: true, reason: 'diplomacy_truce' };
      }
    }

    // 1c. Proof-of-Leverage cache-exposure threat (truce_type = 'proof_leverage').
    if (truceTerms['truce_type'] === 'proof_leverage') {
      // The Proof-of-Leverage threat: a player who has demonstrated cache knowledge
      // can compel deactivation (canon retaliation_mechanics.md:48 — §13 forward slot).
      // This branch fires when the player explicitly passes a proof_leverage truce clause.
      return { deactivated: true, reason: 'diplomacy_truce' };
    }

    // 2. No valid truce clause found.
    return { deactivated: false, reason: 'no_active_truce' };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────────────────────

  /**
   * `getThresholdBucketForRival` — maps a rival key to its per-rival trigger threshold bucket.
   * All values are getter-sourced (NEVER inlined). Saltline is [PROV-Y26Q2] (OQ-A1).
   */
  private getThresholdBucketForRival(rivalKey: RivalKey): string {
    switch (rivalKey) {
      case 'tarcum':      return this.tunables.deadHandTriggerThresholdTarcumBucket;     // composite:LOW (ref 0.20)
      case 'coil':        return this.tunables.deadHandTriggerThresholdCoilBucket;       // composite:MINIMAL (ref 0.10)
      case 'iron_throat': return this.tunables.deadHandTriggerThresholdIronThroatBucket; // composite:MEDIUM (ref 0.15)
      case 'saltline':    return this.tunables.deadHandTriggerThresholdSaltlineBucket;   // [PROV-Y26Q2] composite:LOW
    }
  }
}

// ── Detection probability composite mapping ───────────────────────────────────────────────────────
//
// Canon (retaliation_mechanics.md:58): the detection probability is a composite tunable
// (`composite:STANDARD`, ref 0.55). The service uses it as the `chance(p)` probability
// for the seeded draw. NEVER inline 0.55.

function compositeToDetectionProb(bucketStr: string): number {
  const upper = bucketStr.toUpperCase();
  if (upper.includes('MINIMAL'))  return 0.20;
  if (upper.includes('LOW'))      return 0.35;
  if (upper.includes('STANDARD')) return 0.55; // canonical default (composite:STANDARD)
  if (upper.includes('MEDIUM'))   return 0.65;
  if (upper.includes('HIGH'))     return 0.80;
  return 0.55; // safe fallback to STANDARD
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C3 (accrual)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md
//               §State (:40-71), §Discovery mechanic (:75-92), §3 formula
//             Decision #2 (ratified): accrual via Tier3LawyerUsedEvent bus-decoupled seam.
//             Decision #4 (ratified 2026-06-30): lawyer LIVE; 4 reserved types inert.
//             ⚠️ PÉRIMÉ — CORRIGÉ 2026-08-08. `clerk` est LIVE depuis 04f-B, par un chemin de
//               PRODUCTION : recruitment-quest.service.ts:336 appelle recordCorruptUse(playerId,
//               candidateId, 'clerk', 'small_bribe', …), atteint depuis @Post('recruitment/quests/
//               :id/advance') + @UseGuards(JwtAuthGuard) (recruitment.controller.ts:115-117).
//               Le fichier appelant le dit lui-même (:34) : « recordCorruptUse ACTIVATES the
//               reserved-inert 'clerk' target type ». État réel : 2 LIVE (lawyer, clerk),
//               3 réservés-inertes (port_inspector, broker, judge_aide).
//             ★ Ce carve-out se disait « anti-fig-leaf » et EST DEVENU le fig leaf : son énoncé
//               était daté (« at 04d-B »), vrai à sa date, jamais relu quand un lot ultérieur a
//               activé le type. Un agent lisant ce commentaire a conclu de bonne foi que clerk
//               était inerte — le code mentait. Canon corrigé au même commit :
//               docs/tech/09_data_model/schema_internal_affairs.md.
//             — 04d-B C3 — 2026-07-02

import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { Tier3LawyerUsedEvent } from '../../citysim/events/city-event-bus';
import { internalAffairsTarget } from '../../db/schema/internal_affairs';
import type { InternalAffairsTargetRow } from '../../db/schema/internal_affairs';
import { lawyer } from '../../db/schema/legal';
import { recruitmentCandidates } from '../../db/schema/recruitment';
import { IATunables } from './ia.tunables';
import { IAInvestigationService } from './ia-investigation.service';
import { LawyerService } from '../legal/lawyer.service';
import { BossMirrorService } from '../reputation/boss-mirror.service';
import { IA_WEEKLY_MINUTES } from './ia-decay.service';
import { ApiError } from '../../protocol/api-error';

// ── Public type aliases (C3 — consumed by ia-test.controller.ts + C5 forward cascade) ────────────

/**
 * The 5 target categories. ⚠️ CORRIGÉ 2026-08-08 (W6a C3-bis) — 2 are LIVE (`lawyer`, `clerk`),
 * 3 remain reserved-inert (`port_inspector`, `broker`, `judge_aide`, no referent table — see
 * `_hasReferentAccess` below). See the file-header note for the `clerk` correction history.
 */
export type IATargetType = 'clerk' | 'port_inspector' | 'lawyer' | 'broker' | 'judge_aide';

/**
 * Corruption action severity categories (canon §3.4 severity ladder).
 * Ladder (structural): small_bribe < big_bribe < clerk_mutation < lawyer_payoff.
 */
export type IAActionSeverity = 'small_bribe' | 'big_bribe' | 'clerk_mutation' | 'lawyer_payoff';

/**
 * Player reputation bucket for the 3rd accrual factor.
 * Derived from BossMirrorService.getConsistencyIndex — resolved INTERNALLY by
 * `IATargetService.recordCorruptUse` (W6a C3-bis.2: SUPPRESSED as a caller-supplied argument, on
 * every call site — not just HTTP. `_severityCompositeKey`'s sibling `_profileCompositeKey` still
 * maps this type to its registry composite; only the RESOLUTION of which bucket a player is in
 * moved server-side).
 */
export type IAPlayerReputationBucket = 'low_rep' | 'high_rep';

// ── weight_per_player JSONB entry shape ──────────────────────────────────────────────────────────

/**
 * Per-player entry in the `weight_per_player` JSONB map.
 *
 * R2.2/P5: SERVER-ONLY — never forwarded to any client endpoint.
 * Test routes (R-EC-2) expose it for E2E assertion only.
 */
export interface PlayerWeightEntry {
  /** Cumulative suspicion weight contributed by this player (summed across calls). */
  readonly weight: number;
  /** Rolling 30-game-day use count (resets when gameDay - window_start_day > 30). */
  readonly uses_in_last_30d: number;
  /** Game day (Math.floor(gameMinute / 1440)) when the current 30d window started. */
  readonly window_start_day: number;
}

// ── Composite ref resolver ────────────────────────────────────────────────────────────────────────
// Pattern mirrors credibility-accumulator.service.ts + dual-use-signal.service.ts (04b-C).

/**
 * Translate a composite bucket string to its reference float.
 * Falls back to numeric parse, then 0 (safe no-op for misconfigured buckets).
 *
 * @internal
 */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0; // safe fallback — misconfigured bucket → no-op increment
}

// ── Severity ref map [PROV-Y26Q2] ────────────────────────────────────────────────────────────────
// Canon §3.4 severity ladder (structural ordering: small_bribe < big_bribe < clerk_mutation < lawyer_payoff).
// Values [PROV-Y26Q2] — calibration TD; chosen to yield measurably distinct suspicion increments
// per action type (falsifiable: different severities → different increments → different suspicion_level).
const SEVERITY_REF_MAP: Record<string, number> = {
  'composite:severity_low':     0.05, // small_bribe     [PROV-Y26Q2]
  'composite:severity_medium':  0.10, // big_bribe       [PROV-Y26Q2]
  'composite:severity_high':    0.20, // clerk_mutation  [PROV-Y26Q2]
  'composite:severity_extreme': 0.35, // lawyer_payoff   [PROV-Y26Q2]
};

// ── Player profile weight ref map [PROV-Y26Q2] ───────────────────────────────────────────────────
// Canon §3.4 "high-reputation players get more weight (IA prioritizes high-value cases)".
// Values [PROV-Y26Q2] — ratio high_rep/low_rep = 2.0 (high-rep attracts twice as much IA attention).
const PROFILE_WEIGHT_REF_MAP: Record<string, number> = {
  'composite:weight_minor': 0.75, // low_rep  [PROV-Y26Q2]
  'composite:weight_major': 1.50, // high_rep [PROV-Y26Q2]
};

// ── Reputation classification threshold [PROV-Y26Q2] ─────────────────────────────────────────────
// consistency_index >= PROV_HIGH_REP_THRESHOLD → 'high_rep'; else 'low_rep'.
// Source: BossMirrorService.getConsistencyIndex (player-level, no lieutenant/cell needed).
// 0.70 = "mostly consistent player" — reasonable split for IA priority classification.
const PROV_HIGH_REP_THRESHOLD = 0.70; // [PROV-Y26Q2]

// ── IATargetService ───────────────────────────────────────────────────────────────────────────────

@Injectable()
export class IATargetService implements OnModuleInit {
  private readonly logger = new Logger(IATargetService.name);

  constructor(
    // DB for direct Drizzle access (same pattern as IATestController — ia-test.controller.ts:119).
    @Inject(DB) private readonly db: DrizzleClient,
    // Tunables registry-mirrored getters (C2).
    private readonly tunables: IATunables,
    // C4: surveillance window roll during active investigations (NOT circular — IAInvestigationService
    // depends on DB+IATunables+CityEventBus; no dep on IATargetService).
    private readonly investigationService: IAInvestigationService,
    // §13 seam: recordTier3Use (reverse burn bump) + forceBurnLawyer (C5 forward cascade).
    private readonly lawyerService: LawyerService,
    // Player-profile weight resolution: consistency_index → high_rep | low_rep.
    private readonly bossMirror: BossMirrorService,
    // Bus: subscribe to Tier3LawyerUsedEvent (decision #2) + emit IA events (C4/C5).
    private readonly bus: CityEventBus,
  ) {}

  // ── OnModuleInit — bus subscription (decision #2) ──────────────────────────────────────────────

  /**
   * `onModuleInit` — subscribe to `Tier3LawyerUsedEvent` (decision #2, 2026-07-01).
   *
   * Pattern mirrors `LegalCaseService.onModuleInit` (legal-case.service.ts:105).
   * Bus-decoupled: A (`LawyerService.issueTier3Payoff`) emits `Tier3LawyerUsedEvent`; B (this
   * service) subscribes here in `onModuleInit`. No import of A from B (no circular dependency).
   *
   * The `.catch()` wrapper ensures a handler failure never crashes the event-emitter loop or
   * corrupts A's `issueTier3Payoff` response (contained failure pattern).
   *
   * ADDITIVE to the bus channel: this is the FIRST subscriber for `tier3_lawyer_used`.
   * The emit side (A = `LawyerService.issueTier3Payoff`) was extended +14 lines to add the
   * `Tier3LawyerUsedEvent` emit (04d-B C3 additive). Side-effect: `burn_risk_score` is now
   * incremented TWICE per `issueTier3Payoff` call — once by A's step 7 (synchronous,
   * returned in the HTTP response body) and once by B's `recordTier3Use` call here (async,
   * bus-decoupled, same tunable `tier3PayoffBurnRiskIncrement`). This double-burn is
   * INTENTIONAL per plan §C3 (IA detection of corrupt usage carries the same burn-risk
   * weight as the explicit payoff). The `lawyer_burn_risk` C8/A spec is updated to assert
   * the sync response value (1 × increment) and then poll the DB until it settles at
   * 2 × increment after B's async handler completes.
   */
  onModuleInit(): void {
    this.bus.onTier3LawyerUsed((event: Tier3LawyerUsedEvent) => {
      this.handleTier3LawyerUsed(event).catch((err: unknown) =>
        this.logger.error(
          `IATargetService Tier3LawyerUsed handler failed (contained): ` +
            `playerId=${event.playerId} lawyerId=${event.lawyerId} ` +
            `gameMinute=${event.gameMinute} ` +
            `${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'IATargetService subscribed to Tier3LawyerUsedEvent (decision #2 RATIFIÉ 2026-07-01). ' +
        'Chain: issueTier3Payoff(A) → Tier3LawyerUsedEvent(bus) → ' +
        'handleTier3LawyerUsed(B) → recordCorruptUse(lawyer,lawyer_payoff) + recordTier3Use. ' +
        'ADDITIVE — no existing subscriber modified. C3.',
    );
  }

  // ── handleTier3LawyerUsed — bus event handler ──────────────────────────────────────────────────

  /**
   * `handleTier3LawyerUsed` — bus subscriber for `Tier3LawyerUsedEvent`.
   *
   * Chain (decision #2):
   *   1. Call `recordCorruptUse(playerId, lawyerId, 'lawyer', 'lawyer_payoff', gameMinute)`.
   *   2. Call `LawyerService.recordTier3Use(lawyerId, gameMinute)` — reverse burn bump (§13 hook).
   *
   * ⚠️ W6a C3-bis (2026-08-08): step 1 used to resolve `playerReputationBucket` HERE
   * (`bossMirror.getConsistencyIndex` → high/low) and pass it as a 5th argument.
   * `recordCorruptUse` now resolves it internally (the SAME lookup, moved rather than duplicated —
   * C3-bis.2) so this handler no longer needs its own copy.
   *
   * @internal — called only via onModuleInit bus subscription and test probes.
   */
  private async handleTier3LawyerUsed(event: Tier3LawyerUsedEvent): Promise<void> {
    // 1. Record the corrupt use: 3-factor suspicion accrual on the lawyer IA target.
    //    playerReputationBucket is resolved INSIDE recordCorruptUse (C3-bis.2) — no longer a param.
    await this.recordCorruptUse(
      event.playerId,
      event.lawyerId,
      'lawyer',
      'lawyer_payoff',
      event.gameMinute,
    );

    // 2. Reverse burn bump (§13 hook): notify A's LawyerService that IA detected this use.
    // Decision #2: B calls A's recordTier3Use → increments burn_risk_score (same tunable as payoff).
    // This is intentional double-increment: the payoff itself + IA's detection both contribute.
    await this.lawyerService.recordTier3Use(event.lawyerId, event.gameMinute);

    this.logger.log(
      `[§13 handleTier3LawyerUsed] playerId=${event.playerId} lawyerId=${event.lawyerId} ` +
        `gameMinute=${event.gameMinute} ` +
        `→ recordCorruptUse(lawyer_payoff) + recordTier3Use(§13 reverse bump) DONE.`,
    );
  }

  // ── recordCorruptUse — the 3-factor accrual mechanic (PUBLIC for test probe + C5 forward) ───────

  /**
   * `recordCorruptUse` — the 3-factor suspicion accumulation mechanic (canon §3.4 formula).
   *
   * Formula:
   *   suspicion_increment = min(base_severity_weight[actionSeverity]
   *                              × frequency_multiplier(uses_in_last_30d ^ exponent)
   *                              × player_profile_weight[playerReputationBucket],
   *                            maxSuspicionIncrementPerAct)   ← W6a C3-bis.3 cap
   *
   * Where:
   *   base_severity_weight — resolved from IATunables composite getter → SEVERITY_REF_MAP
   *   frequency_multiplier — `uses_in_last_30d ^ frequencyMultiplierCurveExponent` (non-linear)
   *   player_profile_weight — resolved INTERNALLY from BossMirrorService.getConsistencyIndex
   *
   * ★ W6a C3-bis (2026-08-08 re-spec — replaces the original 04d-B C3 contract):
   *   - The garde is on the REFERENT the caller names (`targetNpcId`), never on the IA row itself
   *     — `internal_affairs_targets` is GLOBAL / no-owner by design (ch09 §4 decision 1) and stays
   *     that way. `_hasReferentAccess` resolves, PER `targetType`, whether `playerId` may legitimately
   *     use the NPC `targetNpcId` names — exhaustive switch, deny-by-default (see that method's doc).
   *   - `playerReputationBucket` is REMOVED from the signature — resolved here exactly as
   *     `handleTier3LawyerUsed` used to (moved, not duplicated: `recruitment-quest.service.ts` had
   *     independently replicated the SAME lookup VERBATIM — this removes that copy too).
   *   - `actionSeverity` stays an argument (the two live producers each declare their own act:
   *     `lawyer_payoff` / `small_bribe`) but is no longer accepted from any HTTP request body on a
   *     production surface (C3-bis.2).
   *   - The real unbounded vector was neither enum: it was the PRODUCT `suspicion_increment` itself
   *     (C3-bis.3) — capped below via `maxSuspicionIncrementPerAct`, BEFORE both places that consume
   *     it (the level clamp AND the `weight_per_player` accumulation — the former never protected
   *     the latter).
   *
   * Steps:
   *   1. Resolve the caller's access to the referent `targetNpcId` names (deny-by-default) → 404.
   *   2. Resolve `player_profile_weight` from BossMirrorService.getConsistencyIndex(playerId).
   *   3. Resolve `base_severity_weight` from composite ref.
   *   4. Get or create the `internal_affairs_targets` row for (targetNpcId, targetType).
   *   5. Read current `cooperators` (string[]) and `weight_per_player` (map) from the row.
   *   6. Compute `uses_in_last_30d` (rolling 30-game-day window, reset on expiry).
   *   7. Compute `frequency_multiplier = uses_in_last_30d ^ exponent`.
   *   8. Compute `suspicion_increment = min(factor1 × factor2 × factor3, cap)`.
   *   9. Clamp `new_suspicion_level = min(1.0, current + increment)`.
   *  10. Update `cooperators` (append player once).
   *  11. Update `weight_per_player` (increment uses + weight, using the CAPPED increment).
   *  12. DB UPDATE with new values.
   *
   * Determinism: NO `Math.random()`. NO `Date.now()`. `gameDay = Math.floor(gameMinute / 1440)`.
   * All inputs are (target snapshot, game-time, tunables, referent row) — pure function of
   * deterministic inputs (the referent read is a snapshot read, not a source of randomness).
   *
   * R2.2/P5: `suspicion_level`, `cooperators`, `weight_per_player` are SERVER-ONLY.
   *   Never returned by any production endpoint. Test routes expose them per R-EC-2.
   *
   * @param playerId       — the player who used the corrupt actor. Must have legitimate access to
   *                         the referent `targetNpcId` names (W6a C3-bis) — otherwise 404.
   * @param targetNpcId    — the NPC UUID (soft ref; for lawyer = lawyers.lawyer_id, for clerk =
   *                         recruitment_candidates.candidate_id).
   * @param targetType     — actor category (`lawyer`/`clerk` LIVE; 3 others reserved-inert, no
   *                         referent table — always 404, deny-by-default).
   * @param actionSeverity — severity bucket of the corrupt act (declared by the calling producer).
   * @param gameMinute     — current in-game minute (for window tracking + logging).
   * @returns `{ targetId, newSuspicionLevel }` — test routes assert the increment is non-zero.
   * @throws ApiError('RESOURCE_NOT_FOUND') if `playerId` has no legitimate access to the referent
   *         (W6a C3-bis.1 — referent absent, owned by a different player, or a type with no
   *         referent table at all).
   */
  async recordCorruptUse(
    playerId: string,
    targetNpcId: string,
    targetType: IATargetType,
    actionSeverity: IAActionSeverity,
    gameMinute: number,
  ): Promise<{ targetId: string; newSuspicionLevel: number }> {
    const gameDay = Math.floor(gameMinute / 1440); // deterministic — no Date.now()

    // ── W6a C3-bis.1: referent guard, BEFORE _getOrCreateTarget — deny-by-default ────────────────
    const hasAccess = await this._hasReferentAccess(targetNpcId, targetType, playerId);
    if (!hasAccess) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message:
          `recordCorruptUse: targetNpcId=${targetNpcId} (targetType=${targetType}) is not a ` +
          `referent playerId=${playerId} may legitimately use (W6a C3-bis.1 — absent, owned by ` +
          `another player, or a type with no referent table at all).`,
      });
    }

    // ── Factor 3 input: player_profile_weight resolved INTERNALLY (C3-bis.2, moved not duplicated) ─
    const consistencyRow = await this.bossMirror.getConsistencyIndex(playerId);
    const playerReputationBucket: IAPlayerReputationBucket =
      (consistencyRow?.consistency_index ?? 0) >= PROV_HIGH_REP_THRESHOLD
        ? 'high_rep'
        : 'low_rep';

    // ── Factor 1: base_severity_weight ────────────────────────────────────────────────────────
    const severityComposite = this._severityCompositeKey(actionSeverity);
    const baseSeverityWeight = resolveCompositeRef(severityComposite, SEVERITY_REF_MAP);

    // ── Get or create the IA target row ───────────────────────────────────────────────────────
    const target = await this._getOrCreateTarget(targetNpcId, targetType);

    // ── Read current cooperators + weight_per_player ──────────────────────────────────────────
    const cooperators = (target.cooperators as string[]) ?? [];
    const weightPerPlayer =
      (target.weight_per_player as Record<string, PlayerWeightEntry>) ?? {};

    // ── Factor 2: frequency_multiplier ────────────────────────────────────────────────────────
    // Rolling 30-game-day window. Expired if gameDay - window_start_day > 30.
    const exponent = this.tunables.frequencyMultiplierCurveExponent;
    const existingEntry = weightPerPlayer[playerId];
    const windowExpired =
      !existingEntry || gameDay - existingEntry.window_start_day > 30;

    // New count AFTER this use: window reset → 1, else increment.
    const usesInLast30d = windowExpired ? 1 : existingEntry.uses_in_last_30d + 1;
    const windowStartDay = windowExpired ? gameDay : existingEntry.window_start_day;

    // Non-linear compounding: more uses → exponentially more suspicion per act.
    const frequencyMultiplier = Math.pow(usesInLast30d, exponent);

    // ── Factor 3: player_profile_weight ───────────────────────────────────────────────────────
    const profileComposite = this._profileCompositeKey(playerReputationBucket);
    const playerProfileWeight = resolveCompositeRef(profileComposite, PROFILE_WEIGHT_REF_MAP);

    // ── Compute suspicion_increment (the 3-factor product), THEN cap it (W6a C3-bis.3) ──────────
    // All 3 factors are deterministic pure-function results — no RNG, no wall-clock.
    // R2.3: the cap is sourced from the registry getter, never an inline scalar.
    const rawSuspicionIncrement = baseSeverityWeight * frequencyMultiplier * playerProfileWeight;
    const suspicionIncrement = Math.min(
      rawSuspicionIncrement,
      this.tunables.maxSuspicionIncrementPerAct,
    );

    // ── Clamp new suspicion_level to [0, 1] ───────────────────────────────────────────────────
    const newSuspicionLevel = Math.min(1.0, target.suspicion_level + suspicionIncrement);

    // ── Update cooperators (set — append once if not already present) ─────────────────────────
    const updatedCooperators: string[] = cooperators.includes(playerId)
      ? cooperators
      : [...cooperators, playerId];

    // ── Update weight_per_player entry — uses the CAPPED increment (W6a C3-bis.3: the level clamp
    //    above never protected this accumulation, which feeds burn attribution, C9) ──────────────
    const updatedWeightPerPlayer: Record<string, PlayerWeightEntry> = {
      ...weightPerPlayer,
      [playerId]: {
        uses_in_last_30d: usesInLast30d,
        window_start_day: windowStartDay,
        weight: (existingEntry?.weight ?? 0) + suspicionIncrement,
      },
    };

    // ── C6 cool-off guard: stamp last_weekly_decay_at = thisWeekEpoch ────────────────────────
    // Purpose: marks that this target was ACTIVE this game-week. The WEEKLY decay tick
    // (IA_DECAY_TICK WEEKLY/10) filters targets WHERE last_weekly_decay_at < thisWeekEpoch.
    // By stamping it here, we prevent the decay tick from decrementing an actively-used target
    // this week (cool-off mechanic: only IDLE targets decay).
    //
    // thisWeekEpoch = new Date(weekId × IA_WEEKLY_MINUTES × 60_000) — game-time pseudo-epoch.
    // Deterministic: depends ONLY on gameMinute (no Date.now(), no Math.random()).
    // Same weekId → same epoch; recordCorruptUse and applyWeeklySuspicionDecay share this encoding.
    // IA_WEEKLY_MINUTES imported from ia-decay.service.ts (C6 MINOR: dedup of local const).
    const weekIdForStamp = Math.floor(gameMinute / IA_WEEKLY_MINUTES);
    const thisWeekEpoch = new Date(weekIdForStamp * IA_WEEKLY_MINUTES * 60_000);

    // ── DB UPDATE ─────────────────────────────────────────────────────────────────────────────
    await this.db
      .update(internalAffairsTarget)
      .set({
        suspicion_level:       newSuspicionLevel,
        cooperators:           updatedCooperators,
        weight_per_player:     updatedWeightPerPlayer,
        // NOTE (C6 MINOR): `last_weekly_decay_at` defaults to `now()` (wall-clock) at target creation
        // (see internal_affairs.ts:defaultNow). This is intentional: a freshly-created target has
        // last_weekly_decay_at = real-clock-now, which is always > thisWeekEpoch (game-time epoch
        // for early game-minutes). So new targets are NOT decayed in their creation week.
        // This stamp overrides it to thisWeekEpoch when recordCorruptUse is called (cool-off guard).
        last_weekly_decay_at:  thisWeekEpoch, // C6 cool-off guard: marks "active this week"
      })
      .where(eq(internalAffairsTarget.target_id, target.target_id));

    // ── Surveillance window roll (C4): if target has an active investigation, roll detection ──────
    // C4 prerequisite: target.investigation_id is set by evaluateThresholdCrossing (NIGHTLY/17).
    // For actions DURING the window, roll the seeded detection probability.
    // No-op if investigation_id is null (most common case — no investigation open yet).
    if (target.investigation_id) {
      // W6a C3: runSurveillanceWindow's signature changed — `playerId` is now first and required.
      // Mechanical adaptation only: at this point in `recordCorruptUse`, `playerId` has ALREADY
      // been persisted into `updatedCooperators` above (the DB UPDATE a few lines up), so it is
      // already a legitimate cooperator of `target` by the time this call happens — the new guard
      // in runSurveillanceWindow does not change this call's outcome.
      await this.investigationService.runSurveillanceWindow(
        playerId,
        target.investigation_id,
        gameDay,
        gameMinute,
      );
    }

    this.logger.log(
      `[recordCorruptUse] ` +
        `playerId=${playerId} targetNpcId=${targetNpcId} targetType=${targetType} ` +
        `actionSeverity=${actionSeverity} repBucket=${playerReputationBucket} ` +
        `gameDay=${gameDay} uses=${usesInLast30d} windowExpired=${windowExpired} ` +
        `baseSev=${baseSeverityWeight.toFixed(4)} ` +
        `freqMult=${frequencyMultiplier.toFixed(4)} (exp=${exponent}) ` +
        `profileW=${playerProfileWeight.toFixed(4)} ` +
        `rawIncrement=${rawSuspicionIncrement.toFixed(6)} ` +
        `increment=${suspicionIncrement.toFixed(6)} (cap=${this.tunables.maxSuspicionIncrementPerAct}) ` +
        `suspicion=${target.suspicion_level.toFixed(4)}→${newSuspicionLevel.toFixed(4)}`,
    );

    return { targetId: target.target_id, newSuspicionLevel };
  }

  // ── W6.3 C3/C4: resolveOwnedTarget — THE property resolver, unique point of truth ────────────────

  /**
   * `resolveOwnedTarget` — W6.3 C3/C4: resolve `{ target_id }` for a (playerId, actorRef,
   * actorType) triple, or `null` if `playerId` has no legitimate access to that referent, OR if
   * no `internal_affairs_targets` row exists yet for it (nothing to reveal — no suspicion
   * accrued).
   *
   * THE property resolver — the unique point of truth C3's actor listing AND C4's intel-purchase
   * guard both call. Two steps:
   *   1. `_hasReferentAccess(actorRef, actorType, playerId)` — REUSE VERBATIM (`:516-551` below).
   *      This is the SAME ownership check `recordCorruptUse` already applies — a player may only
   *      resolve a referent they legitimately own (their own `lawyers`/`recruitment_candidates`
   *      row), never an arbitrary NPC id.
   *   2. Lookup `internal_affairs_targets WHERE target_npc_id = actorRef AND target_type =
   *      actorType`. No row (referent never accrued suspicion) → `null` too — there is nothing
   *      for the caller to reveal.
   *
   * ★ `target_id` is the row's OWN internal pivot — it is returned here for the CALLER's internal
   * use (C4 needs it to insert `ia_intel_purchases.target_id`) but MUST NEVER be forwarded to an
   * HTTP response (C3 explicitly excludes it from `ActorStatusResult`/the actors list — R2.2/P5).
   *
   * @param playerId  — the caller's player uuid (never client-supplied — resolved from the JWT).
   * @param actorRef  — the NPC reference the player names (e.g. a `lawyer_id` or `candidate_id`).
   * @param actorType — the `IATargetType` the caller claims `actorRef` belongs to.
   * @returns `{ target_id }` if `playerId` owns `actorRef` AND a target row exists, else `null`.
   */
  async resolveOwnedTarget(
    playerId: string,
    actorRef: string,
    actorType: IATargetType,
  ): Promise<{ target_id: string } | null> {
    const hasAccess = await this._hasReferentAccess(actorRef, actorType, playerId);
    if (!hasAccess) return null;

    const [row] = await this.db
      .select({ target_id: internalAffairsTarget.target_id })
      .from(internalAffairsTarget)
      .where(
        and(
          eq(internalAffairsTarget.target_npc_id, actorRef),
          eq(internalAffairsTarget.target_type, actorType),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────────────────────────

  /**
   * Get or create an `internal_affairs_targets` row for the given (targetNpcId, targetType).
   *
   * SELECT first (the common case — same lawyer reused → same row).
   * INSERT if absent — creates a fresh target with suspicion_level=0 and empty JSONB fields.
   *
   * No unique constraint on (target_type, target_npc_id) in the schema — the SELECT-then-INSERT
   * pattern is safe under sequential E2E execution (charte ch27: no concurrent test workers).
   *
   * @internal
   */
  private async _getOrCreateTarget(
    targetNpcId: string,
    targetType: IATargetType,
  ): Promise<InternalAffairsTargetRow> {
    const [existing] = await this.db
      .select()
      .from(internalAffairsTarget)
      .where(
        and(
          eq(internalAffairsTarget.target_npc_id, targetNpcId),
          eq(internalAffairsTarget.target_type, targetType),
        ),
      )
      .limit(1);

    if (existing) return existing;

    const [inserted] = await this.db
      .insert(internalAffairsTarget)
      .values({
        target_type:   targetType,
        target_npc_id: targetNpcId,
      })
      .returning();

    return inserted!;
  }

  /**
   * `_hasReferentAccess` — W6a C3-bis.1: resolve whether `playerId` has legitimate access to the
   * REFERENT `targetNpcId` names, for the given `targetType`.
   *
   * This is P-A (§1/P-A, "toute lecture d'objet devient une lecture conjointe"), NOT an exception
   * to it: the object the caller names here is never the IA row itself (`_getOrCreateTarget`
   * creates it if absent — there is nothing to own) — it's the NPC. `target_npc_id` is a documented
   * soft-ref (`internal_affairs.ts:172-175`); the joint read therefore runs against the REFERENT's
   * own table:
   *   - `lawyer`  → `lawyers.lawyer_id = targetNpcId AND lawyers.player_id = playerId`
   *                 (`player_id` NOT NULL — `db/schema/legal.ts:149`).
   *   - `clerk`   → `recruitment_candidates.candidate_id = targetNpcId AND
   *                 recruitment_candidates.player_id = playerId` (`player_id` NOT NULL —
   *                 `db/schema/recruitment.ts:48`). LIVE since 04f-B — see file header.
   *
   * ★ Exhaustive switch, NO `default`: TypeScript requires every branch to return (no code path may
   * fall off the end), so a 6th `IATargetType` member added to the union is a COMPILE ERROR here,
   * not a silent pass-through — mirrors `_severityCompositeKey`/`_profileCompositeKey` below.
   *
   * ★ Deny-by-default: `port_inspector` / `broker` / `judge_aide` have NO referent table today —
   * they return `false` unconditionally, never a pass-through. This is deliberate (C3-bis.1.3): the
   * day someone wires a live caller for one of them WITHOUT writing its resolver case here, their
   * OWN new path renders 404 immediately — instead of the silent IDOR that `clerk` just was (the
   * carve-out that used to cover these 3 read "no live caller" and, unnoticed, went stale for
   * `clerk` — see the file-header correction).
   *
   * Known scope limit (named, not hidden — C3-bis.1 note 1): both live referents are
   * player-EXCLUSIVE (`player_id` NOT NULL, one row = one owner). No live path can therefore ever
   * produce a SECOND cooperator on the same target row today, even though `internal_affairs_targets`
   * is modeled as multi-cooperator by design (ch09 §4 decision 1, `cooperators` jsonb list). That
   * capability is dead code until a genuinely-shared NPC referent exists — this method answers
   * "can this player legitimately use this actor?", not "does this player own this row?", so the
   * two questions stay separable when that day comes.
   *
   * @internal
   */
  private async _hasReferentAccess(
    targetNpcId: string,
    targetType: IATargetType,
    playerId: string,
  ): Promise<boolean> {
    switch (targetType) {
      case 'lawyer': {
        const [row] = await this.db
          .select({ lawyer_id: lawyer.lawyer_id })
          .from(lawyer)
          .where(and(eq(lawyer.lawyer_id, targetNpcId), eq(lawyer.player_id, playerId)))
          .limit(1);
        return !!row;
      }
      case 'clerk': {
        const [row] = await this.db
          .select({ candidate_id: recruitmentCandidates.candidate_id })
          .from(recruitmentCandidates)
          .where(
            and(
              eq(recruitmentCandidates.candidate_id, targetNpcId),
              eq(recruitmentCandidates.player_id, playerId),
            ),
          )
          .limit(1);
        return !!row;
      }
      case 'port_inspector':
      case 'broker':
      case 'judge_aide':
        // No referent table exists for these 3 today (C3-bis.1) — deny-by-default, not a
        // pass-through. Do NOT turn this into a `default:` case (see method doc — that is exactly
        // what would swallow a 6th enum member silently instead of failing the build).
        return false;
    }
  }

  /**
   * Map `IAActionSeverity` to the IATunables composite getter result (the registry string).
   * @internal
   */
  private _severityCompositeKey(actionSeverity: IAActionSeverity): string {
    switch (actionSeverity) {
      case 'small_bribe':    return this.tunables.actionSeverityWeightSmallBribe;
      case 'big_bribe':      return this.tunables.actionSeverityWeightBigBribe;
      case 'clerk_mutation': return this.tunables.actionSeverityWeightClerkMutation;
      case 'lawyer_payoff':  return this.tunables.actionSeverityWeightLawyerPayoff;
    }
  }

  /**
   * Map `IAPlayerReputationBucket` to the IATunables composite getter result (the registry string).
   * @internal
   */
  private _profileCompositeKey(playerReputationBucket: IAPlayerReputationBucket): string {
    switch (playerReputationBucket) {
      case 'low_rep':  return this.tunables.playerProfileWeightLowRep;
      case 'high_rep': return this.tunables.playerProfileWeightHighRep;
    }
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C5 (forward cascade)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md
//               §Discovery mechanic (:75-92), §Forward cascade (:96-104)
//             Decision #1 (backward cascade DEFERRED): NO police_memory multi-cooperator writes.
//             Decision #3 (discovery double-condition): detection_events >= N OR suspicion_level >= T.
//             Decision #4 (lawyer LIVE; 4 reserved-inert): forward hook fires for ALL types.
//             R2.2/P5: suspicion_level, detection_events, cooperators SERVER-ONLY (never on event payload).
//             R2.3: 'ia_lawyer_discovery' declarationType + IA_DISCOVERY_DECLARATION_SEVERITY are
//               [PROV-Y26Q2] inline constants (no canon key exists for these specific values).
//             Anti-fabrication: NO Math.random(), NO Date.now() for the discovery decision.
//             — 04d-B C5 — 2026-07-02

import { Injectable, Logger, Inject } from '@nestjs/common';
import { and, eq, isNull, isNotNull } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { IATargetDiscoveredEvent } from '../../citysim/events/city-event-bus';
import { internalAffairsTarget, iaInvestigation } from '../../db/schema/internal_affairs';
import { IATunables } from './ia.tunables';
import type { IATargetType } from './ia-target.service';
import { LawyerService } from '../legal/lawyer.service';
import { PoliceMemoryService } from '../../citysim/police_memory/police_memory.service';

// ── Declaration constants [PROV-Y26Q2] ──────────────────────────────────────────────────────────
//
// These are IA-specific BPD declaration parameters. There is no canon key for them in gdd/14
// (no `internal_affairs.declaration_type` or `internal_affairs.declaration_severity` row).
// Values are [PROV-Y26Q2] — calibration is deferred; the strings and int are load-bearing only
// in the assertion that a row appears in precinct_memory (not in a player-visible field).
//
// Pattern mirrors InfoLeakService's LEGAL_LEAK_PRECINCT=1 + CHARGE_SEVERITY_TO_BPD_SEVERITY.

/** The declarationType written to the BPD declaration_ledger on lawyer discovery. [PROV-Y26Q2] */
const IA_DISCOVERY_DECLARATION_TYPE = 'ia_lawyer_discovery';

/** BPD severity bucket for an IA discovery event (0-100). [PROV-Y26Q2] Calibration TD (C9).
 *  75 = high-severity (higher than legal_case_leak felony=65, below capital=80). */
const IA_DISCOVERY_DECLARATION_SEVERITY = 75;

/** Precinct to write the exposure declaration to (city-wide channel, building_id=0).
 *  Same as InfoLeakService.LEGAL_LEAK_PRECINCT and courier_caught_leak pattern. */
const IA_DISCOVERY_PRECINCT_ID = 1;

// ── IADiscoveryResult ────────────────────────────────────────────────────────────────────────────

/**
 * Return value of `IADiscoveryService.executeDiscovery`.
 *
 * Fields are present only when `triggered === true` (or when the reason is populated for
 * the non-triggered cases). Only the CLIENT-SAFE subset is used in test route responses
 * (R2.2/P5: `suspicion_level` / `detection_events` are NEVER included here).
 */
export interface IADiscoveryResult {
  /** Whether the discovery was triggered (both conditions false → false). */
  readonly triggered: boolean;
  /** Why the discovery was not triggered (only when triggered=false). */
  readonly reason?: 'target_not_found' | 'already_discovered' | 'conditions_not_met';
  /** The target type (present when triggered=true). */
  readonly targetType?: IATargetType;
  /**
   * Which condition fired the discovery (when triggered=true). [PROV-Y26Q2]
   *   'detection_events' → condition 1 only (events >= N, suspicion below threshold).
   *   'suspicion_level'  → condition 2 only (suspicion >= T, events below threshold).
   *   'both'             → both conditions were true simultaneously.
   */
  readonly conditionMet?: 'detection_events' | 'suspicion_level' | 'both';
  /** Whether the lawyer was burned (only for target_type='lawyer'). */
  readonly burned?: boolean;
  /** Number of Tier-3 cases rerouted to Tier-1 (only for target_type='lawyer'). */
  readonly casesRerouted?: number;
  /** Whether an exposure declaration was written to the BPD ledger. */
  readonly declarationWritten?: boolean;
}

// ── IADiscoveryService ───────────────────────────────────────────────────────────────────────────

@Injectable()
export class IADiscoveryService {
  private readonly logger = new Logger(IADiscoveryService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: IATunables,
    private readonly bus: CityEventBus,
    private readonly lawyerService: LawyerService,
    private readonly policeMemoryService: PoliceMemoryService,
  ) {}

  // ── executeDiscovery — forward cascade ────────────────────────────────────────────────────────

  /**
   * `executeDiscovery` — fires the G9 discovery forward cascade for a target.
   *
   * **Discovery double-condition (decision #3, RATIFIÉ 2026-07-01):**
   *   The discovery triggers when EITHER:
   *   - (cond1) `detection_events.length >= discovery_detection_events_threshold` (N=3 default), OR
   *   - (cond2) `suspicion_level >= discovery_second_suspicion_threshold` (0.85 default).
   *   Determinism: the decision depends on game-state (`detection_events` count + `suspicion_level`),
   *   NOT on wall-clock timestamps (lesson C4 — `opened_at`/`closes_at` are NEVER in the condition).
   *
   * **Idempotent:**
   *   `discovered_at IS NOT NULL` → early return `{ triggered: false, reason: 'already_discovered' }`.
   *   The UPDATE stamp uses `WHERE discovered_at IS NULL` to guard concurrent calls (same pattern
   *   as C4's `WHERE investigation_id IS NULL` idempotency guard).
   *
   * **Forward consequence by target_type:**
   *   - `lawyer` (LIVE): calls `LawyerService.forceBurnLawyer(target_npc_id, gameMinute)` —
   *     emits `LawyerBurnedEvent` + reroutes active Tier-3 cases to Tier-1 (the A §13 action).
   *     Then writes an exposure declaration to `precinct_memory.declaration_ledger` via
   *     `PoliceMemoryService.appendDeclarationEntry` (using `cooperators[0]` as playerId —
   *     the first cooperator who accumulated suspicion on this target).
   *   - `clerk|port_inspector|broker|judge_aide` (RESERVED-INERT, RATIFIÉ #4): log only.
   *     No substrate to cancel. This path IS exercised via the test route/BO force-discovery
   *     (anti-fig-leaf proof, C9).
   *
   * **`IATargetDiscoveredEvent` ALWAYS emitted** on triggered discovery (regardless of target_type).
   *   Qualitative only — NO raw `suspicion_level` / `detection_events` in the event (R2.2/P5).
   *
   * **Backward cascade DEFERRED (decision #1):** This service does NOT touch `police_memory`
   *   via any path other than the explicit `appendDeclarationEntry` forward-exposure write above.
   *   No `applyBackwardCascadeSuspicion`, no cooperator loop, no `CooperatorCascadeApplied` event.
   *
   * **R2.2/P5:** `IATargetDiscoveredEvent` payload contains ONLY `targetId`, `targetType`,
   *   `gameMinute` — NO `suspicion_level`, NO `detection_events`, NO `cooperators`.
   *
   * @param targetId   — the `target_id` UUID from `internal_affairs_targets`.
   * @param gameMinute — current game-time (for event payload + LawyerBurnedEvent + declaration).
   * @returns `IADiscoveryResult` — triggered=false if conditions not met, already discovered, or not found.
   */
  async executeDiscovery(targetId: string, gameMinute: number): Promise<IADiscoveryResult> {
    // ── Step 1: Read target row ──────────────────────────────────────────────────────────────────
    const [target] = await this.db
      .select()
      .from(internalAffairsTarget)
      .where(eq(internalAffairsTarget.target_id, targetId))
      .limit(1);

    if (!target) {
      this.logger.warn(
        `[executeDiscovery] target_id=${targetId} not found — no-op.`,
      );
      return { triggered: false, reason: 'target_not_found' };
    }

    // ── Step 2: Idempotency guard — already discovered ───────────────────────────────────────────
    if (target.discovered_at !== null) {
      this.logger.debug(
        `[executeDiscovery] target_id=${targetId} already discovered at ` +
          `${target.discovered_at.toISOString()} — idempotent no-op.`,
      );
      return { triggered: false, reason: 'already_discovered' };
    }

    // ── Step 3: Get detection_events count from the linked investigation ─────────────────────────
    // If no investigation_id: detectionEventsCount = 0 (condition 1 cannot fire alone).
    // This is correct: targets discovered via the suspicion-level path (condition 2) may have
    // accumulated suspicion to the extreme threshold WITHOUT an open investigation.
    let detectionEventsCount = 0;
    if (target.investigation_id) {
      const [inv] = await this.db
        .select({ detection_events: iaInvestigation.detection_events })
        .from(iaInvestigation)
        .where(eq(iaInvestigation.investigation_id, target.investigation_id))
        .limit(1);
      if (inv) {
        detectionEventsCount = ((inv.detection_events as unknown[]) ?? []).length;
      }
    }

    // ── Step 4: Double-condition evaluation (decision #3, RATIFIÉ 2026-07-01) ──────────────────
    // Determinism: NO Math.random(), NO Date.now() — pure function of game-state scalars.
    const eventsThreshold = this.tunables.discoveryDetectionEventsThreshold;
    const suspThreshold   = this.tunables.discoverySecondSuspicionThreshold;
    const cond1 = detectionEventsCount >= eventsThreshold;
    const cond2 = target.suspicion_level >= suspThreshold;

    if (!cond1 && !cond2) {
      this.logger.debug(
        `[executeDiscovery] target_id=${targetId} conditions NOT met — ` +
          `detection_events=${detectionEventsCount} (need>=${eventsThreshold}) ` +
          `suspicion_level=${target.suspicion_level.toFixed(4)} (need>=${suspThreshold.toFixed(4)}) ` +
          `→ no discovery.`,
      );
      return { triggered: false, reason: 'conditions_not_met' };
    }

    const conditionMet: IADiscoveryResult['conditionMet'] =
      cond1 && cond2 ? 'both' : cond1 ? 'detection_events' : 'suspicion_level';

    this.logger.log(
      `[executeDiscovery] DISCOVERY TRIGGERED — target_id=${targetId} ` +
        `target_type=${target.target_type} conditionMet=${conditionMet} ` +
        `detection_events=${detectionEventsCount}>=${eventsThreshold}=${cond1} ` +
        `suspicion_level=${target.suspicion_level.toFixed(4)}>=${suspThreshold.toFixed(4)}=${cond2} ` +
        `gameMinute=${gameMinute}`,
    );

    // ── Step 5: Stamp discovered_at on target (idempotency guard: WHERE discovered_at IS NULL) ──
    // The UPDATE is a no-op if a concurrent call races here (safe: two concurrent discoveries
    // both stamp the same target → one wins, the other's stamp is a no-op). This mirrors the
    // C4 `WHERE investigation_id IS NULL` pattern.
    await this.db
      .update(internalAffairsTarget)
      .set({ discovered_at: new Date() })
      .where(
        and(
          eq(internalAffairsTarget.target_id, targetId),
          isNull(internalAffairsTarget.discovered_at),
        ),
      );

    // ── Step 6: Mark investigation completed_discovered (if investigation is linked) ─────────────
    if (target.investigation_id) {
      await this.db
        .update(iaInvestigation)
        .set({ status: 'completed_discovered' })
        .where(eq(iaInvestigation.investigation_id, target.investigation_id));

      this.logger.log(
        `[executeDiscovery] investigation_id=${target.investigation_id} ` +
          `status → completed_discovered (target_id=${targetId})`,
      );
    }

    // ── Step 7: Forward consequence by target_type ──────────────────────────────────────────────
    let burned = false;
    let casesRerouted = 0;
    let declarationWritten = false;

    if (target.target_type === 'lawyer') {
      // ── LIVE path: burn the lawyer (§13 forward cascade, A's action) ─────────────────────────
      // `forceBurnLawyer`: emits LawyerBurnedEvent + reroutes active Tier-3 cases to Tier-1.
      // Plan: "for lawyer → call LawyerService.forceBurnLawyer(targetNpcId, gameMinute)"
      // Do NOT modify forceBurnLawyer — consume as-is (canon C5 constraint).
      const burnResult = await this.lawyerService.forceBurnLawyer(
        target.target_npc_id,
        gameMinute,
      );
      burned = burnResult.burned;
      casesRerouted = burnResult.casesRerouted;

      this.logger.log(
        `[executeDiscovery] lawyer=${target.target_npc_id} burned=${burned} ` +
          `casesRerouted=${casesRerouted} gameMinute=${gameMinute}`,
      );

      // ── Exposure declaration: BPD forward-exposure write ──────────────────────────────────────
      // "appendDeclarationEntry public-exposure write" (plan §C5 forward cascade).
      // WriterId = cooperators[0]: the player who accumulated suspicion on this target.
      // For a per-player lawyer target, cooperators[0] is the sole cooperating player.
      // If cooperators is empty (e.g., BO force-discovery without prior accrual): skip — no
      // player to attribute the exposure to (anti-fig-leaf: writing for no player is a no-op).
      // Backward cascade DEFERRED (decision #1): we do NOT loop over all cooperators here.
      const cooperators = (target.cooperators as string[] | null) ?? [];
      if (cooperators.length > 0) {
        const playerId = cooperators[0]!;
        await this.policeMemoryService.appendDeclarationEntry(
          playerId,
          IA_DISCOVERY_PRECINCT_ID,    // precinct 1 — city-wide channel (same as courier_caught_leak)
          IA_DISCOVERY_DECLARATION_TYPE, // 'ia_lawyer_discovery' [PROV-Y26Q2]
          IA_DISCOVERY_DECLARATION_SEVERITY, // 75 [PROV-Y26Q2]
          target.target_npc_id,        // sourceOriginId = lawyer UUID (BPD tracing)
          gameMinute,
        );
        declarationWritten = true;
        this.logger.log(
          `[executeDiscovery] exposure declaration written → ` +
            `player=${playerId} precinct=${IA_DISCOVERY_PRECINCT_ID} ` +
            `type=${IA_DISCOVERY_DECLARATION_TYPE} severity=${IA_DISCOVERY_DECLARATION_SEVERITY} ` +
            `sourceOriginId=${target.target_npc_id} gameMinute=${gameMinute}`,
        );
      } else {
        this.logger.warn(
          `[executeDiscovery] lawyer=${target.target_npc_id} discovery — ` +
            `cooperators empty (BO force-discovery without prior accrual?) — ` +
            `skipping exposure declaration write (no player to attribute to).`,
        );
      }
    } else {
      // ── RESERVED-INERT path (clerk|port_inspector|broker|judge_aide, RATIFIÉ #4) ─────────────
      // No substrate to cancel. Log only — the event (below) is the observable proof.
      // This path IS exercised via the test route + BO force-discovery (anti-fig-leaf, C9).
      // Backward cascade DEFERRED (decision #1): no police_memory multi-cooperator write here.
      this.logger.log(
        `[executeDiscovery] RESERVED-INERT forward hook: ` +
          `target_id=${targetId} target_type=${target.target_type} — ` +
          `no substrate to cancel (inert per RATIFIÉ #4); ` +
          `IATargetDiscoveredEvent will fire (anti-fig-leaf proof, force-discovery C9).`,
      );
    }

    // ── Step 8: Emit IATargetDiscoveredEvent (ALWAYS — regardless of target_type) ───────────────
    // Qualitative only — NO suspicion_level, NO detection_events, NO cooperators (R2.2/P5).
    const discoveredEvent: IATargetDiscoveredEvent = {
      type: 'ia_target_discovered',
      targetId,
      targetType: target.target_type,
      gameMinute,
    };
    this.bus.emitIATargetDiscovered(discoveredEvent);

    this.logger.log(
      `[executeDiscovery] IATargetDiscoveredEvent emitted — ` +
        `targetId=${targetId} targetType=${target.target_type} gameMinute=${gameMinute}`,
    );

    return {
      triggered: true,
      targetType: target.target_type,
      conditionMet,
      burned,
      casesRerouted,
      declarationWritten,
    };
  }

  // ── runDiscoveryPass — NIGHTLY/17 discovery sweep (C5 prod trigger) ──────────────────────────

  /**
   * `runDiscoveryPass` — NIGHTLY sweep of open investigations for discovery.
   *
   * Called by `IATickService` (NIGHTLY/17) **immediately after** `evaluateThresholdCrossing`
   * in the same NIGHTLY tick. This is the PRODUCTION trigger for `executeDiscovery` — the only
   * way the G9 forward cascade fires in a real game (NOT via the test route).
   *
   * **Query**: `internal_affairs_targets WHERE investigation_id IS NOT NULL AND discovered_at IS NULL`.
   * This is intentionally SEPARATE from `evaluateThresholdCrossing`'s query (which filters
   * `WHERE investigation_id IS NULL`). Targets just opened in the same NIGHTLY tick are
   * visible here because `evaluateThresholdCrossing` commits its writes before this method
   * runs (sequential awaits; PG read-committed isolation).
   *
   * **Per-target**: calls `executeDiscovery(target_id, gameMinute)`, which internally evaluates
   * the double-condition (detection_events >= N OR suspicion_level >= T) and no-ops if neither
   * is met. So `runDiscoveryPass` is safe to call even if a target's conditions are not yet met
   * (just returns `conditions_not_met` silently).
   *
   * **L1 skip**: no candidates → ZERO writes → returns `{ discovered: 0 }` immediately.
   *
   * **Idempotent**: `executeDiscovery` guards with `WHERE discovered_at IS NULL` so concurrent
   * or repeated calls are safe.
   *
   * **R2.2/P5**: no raw scalars returned (only the count of triggered discoveries).
   *
   * @param gameMinute — current game-time (from CitySimTickContext.gameMinute).
   * @returns `{ discovered: number }` — count of targets whose discovery was triggered.
   */
  async runDiscoveryPass(gameMinute: number): Promise<{ discovered: number }> {
    // L1 skip: query candidates (non-discovered targets with an open investigation).
    const candidates = await this.db
      .select({
        target_id: internalAffairsTarget.target_id,
      })
      .from(internalAffairsTarget)
      .where(
        and(
          isNotNull(internalAffairsTarget.investigation_id),
          isNull(internalAffairsTarget.discovered_at),
        ),
      );

    if (candidates.length === 0) {
      this.logger.debug(
        `[runDiscoveryPass] NIGHTLY/17 — no open non-discovered targets → L1 skip (ZERO writes).`,
      );
      return { discovered: 0 };
    }

    this.logger.log(
      `[runDiscoveryPass] NIGHTLY/17 — ${candidates.length} candidate(s) with open investigation ` +
        `→ evaluating double-condition for each. gameMinute=${gameMinute}`,
    );

    let discovered = 0;
    for (const candidate of candidates) {
      try {
        const result = await this.executeDiscovery(candidate.target_id, gameMinute);
        if (result.triggered) {
          discovered++;
          this.logger.log(
            `[runDiscoveryPass] discovered target_id=${candidate.target_id} ` +
              `conditionMet=${result.conditionMet} targetType=${result.targetType} ` +
              `burned=${result.burned} casesRerouted=${result.casesRerouted}`,
          );
        } else {
          this.logger.debug(
            `[runDiscoveryPass] target_id=${candidate.target_id} — ` +
              `executeDiscovery no-op: reason=${result.reason}`,
          );
        }
      } catch (err) {
        // Per-target containment: log and continue — one failing target must not block others.
        this.logger.error(
          `[runDiscoveryPass] error processing target_id=${candidate.target_id}: ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `[runDiscoveryPass] NIGHTLY/17 discovery sweep complete — ` +
        `${discovered}/${candidates.length} target(s) discovered. gameMinute=${gameMinute}`,
    );
    return { discovered };
  }
}

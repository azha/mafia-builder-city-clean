// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 10 (C-deesc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §5.2
//             Canon: docs/tech/04b_combat_and_conflict/de_escalation_mechanics.md §6.2
//             — C-deesc — 2026-06-25 —
//
// `DownstreamGateService` — §5.2 / §6.2 Downstream Gate (the hydraulic-jump principle).
//
// Canon (de_escalation_mechanics.md:56-77): conflict intensity transitions abruptly from RUNNING
// (high-velocity) to STANDING (low-depth) based on downstream conditions — NOT upstream pressure.
// Once STANDING, de-escalation locks in until downstream clears.
//
// Methods:
//   `evaluateDownstream(playerId, rivalKey, downstreamCondition)` — evaluates the downstream
//     condition scalar against the regime_transition_threshold (getter-sourced, composite:STANDARD=0.6).
//     If downstreamCondition >= threshold AND current regime is RUNNING:
//       → calls transitionRegime to flip to STANDING REGARDLESS of player aggression.
//       → emits `ConflictFlowRegimeEvent` (type: 'conflict_flow_regime') — NOT 'regime_transition'
//         (OQ-B7 rename to avoid collision with A's RegimeTransitionEvent).
//       → returns { transitioned: true, flow_regime: 'standing', retaliation_suspended: true, event_type }
//     If downstreamCondition < threshold:
//       → no transition; returns { transitioned: false, flow_regime: 'running', retaliation_suspended: false, event_type: null }
//
//   `transitionRegime(playerId, rivalKey, regime)` — upserts conflict_flow_state.flow_regime.
//
//   `getConflictFlowRegime(playerId, rivalKey)` — the §13-PRODUCES method.
//     Returns { flow_regime, downstream_condition_bucket } (the P5 exception — flow_regime is shown
//     EXPLICITLY because it gates the player's strategy, canon §5.2 :67).
//     downstream_condition_bucket is a qualitative band (not the raw float).
//
// ★ OQ-B7: The de-escalation event is `ConflictFlowRegimeEvent` (type: 'conflict_flow_regime').
//   DISTINCT from A's `RegimeTransitionEvent` (type: 'regime_transition' — the rival-regime flip).
//   Defined and emitted via CityEventBus.emitConflictFlowRegime (added at C-deesc).
//
// ★ Retaliation suspension: STANDING mode sets retaliation_suspended = true in the returned
//   result (canon §5.2 :71 "STANDING mode suspends rival retaliation scripts"). The suspension
//   is the observable behavioral signal — no rival retaliation script fires while STANDING.
//
// Determinism: NO Math.random(). NO Date.now(). All thresholds getter-sourced.
// ADDITIVE: only reads/upserts conflict_flow_state. Zero-regression.

import { Injectable, Logger } from '@nestjs/common';

import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import { CityEventBus } from '../../../citysim/events/city-event-bus';
import type { ConflictFlowRegimeEvent } from '../../../citysim/events/city-event-bus';
import type { RivalKey } from '../rival/rival-ai.types';
import type { FlowRegime } from './combat.types';

/**
 * Mapping from composite-bucket string to reference float for threshold comparison.
 * All thresholds are getter-sourced (never inline). Matches CumulativeAttritionService pattern.
 */
function compositeToRef(bucketStr: string): number {
  if (bucketStr === 'composite:STANDARD') return 0.60;
  if (bucketStr === 'composite:LOW')      return 0.30;
  if (bucketStr === 'composite:HIGH')     return 0.80;
  if (bucketStr === 'composite:MINIMAL')  return 0.20;
  if (bucketStr === 'composite:MAXIMUM')  return 0.90;
  const parsed = parseFloat(bucketStr);
  return Number.isFinite(parsed) ? parsed : 0.60;
}

/**
 * Map a downstream_condition float to a qualitative bucket string.
 *
 * P5 / R2.2: the player sees only the band, never the raw float.
 *   clear    : condition < 0.30
 *   moderate : 0.30 <= condition < 0.60
 *   heavy    : 0.60 <= condition < 0.85
 *   blocked  : condition >= 0.85
 */
function mapConditionToBucket(condition: number): string {
  if (condition >= 0.85) return 'blocked';
  if (condition >= 0.60) return 'heavy';
  if (condition >= 0.30) return 'moderate';
  return 'clear';
}

@Injectable()
export class DownstreamGateService {
  private readonly logger = new Logger(DownstreamGateService.name);

  constructor(
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
    private readonly eventBus: CityEventBus,
  ) {}

  /**
   * `evaluateDownstream` — evaluate the downstream condition against the regime threshold.
   *
   * The hydraulic-jump principle (canon §6.2 :65): if downstream is BLOCKED (condition >=
   * threshold), the conflict transitions to STANDING REGARDLESS of player aggression.
   *
   * @param playerId - the player identity
   * @param rivalKey - the rival pair identity
   * @param downstreamCondition - the current downstream pressure scalar [0..1]
   * @param gameMinute - the in-game minute (for event payload; default 0)
   *
   * Returns:
   *   { transitioned: boolean, flow_regime: FlowRegime, retaliation_suspended: boolean, event_type: string | null }
   *
   * ★ OQ-B7: if a transition fires, emits ConflictFlowRegimeEvent (type: 'conflict_flow_regime')
   *   — NOT 'regime_transition'. The rename avoids colliding with A's RegimeTransitionEvent.
   *
   * Determinism: NO Math.random(). NO Date.now(). Threshold getter-sourced.
   */
  async evaluateDownstream(
    playerId: string,
    rivalKey: RivalKey,
    downstreamCondition: number,
    gameMinute = 0,
  ): Promise<{
    transitioned: boolean;
    flow_regime: FlowRegime;
    retaliation_suspended: boolean;
    event_type: string | null;
  }> {
    // Read current flow state (creates if absent at reset; always has a row after reset)
    const flowRow = await this.combatRepo.readConflictFlow(playerId, rivalKey);
    const currentRegime: FlowRegime = (flowRow?.flow_regime as FlowRegime) ?? 'running';

    // Threshold from getter (composite:STANDARD = 0.60)
    const thresholdRef = compositeToRef(this.tunables.downstreamRegimeTransitionThresholdBucket);

    // Update the stored downstream_condition
    await this.combatRepo.upsertConflictFlow(playerId, rivalKey, {
      downstream_condition: downstreamCondition,
    });

    // Check: downstream BLOCKED?
    const isBlocked = downstreamCondition >= thresholdRef;

    if (isBlocked && currentRegime === 'running') {
      // Transition RUNNING → STANDING regardless of player aggression
      await this.transitionRegime(playerId, rivalKey, 'standing');

      // Emit ConflictFlowRegimeEvent (OQ-B7 RENAMED — NOT 'regime_transition')
      const event: ConflictFlowRegimeEvent = {
        type: 'conflict_flow_regime',
        playerId,
        rivalKey,
        from: 'running',
        to: 'standing',
        gameMinute,
      };
      this.eventBus.emitConflictFlowRegime(event);

      this.logger.log(
        `DownstreamGate: RUNNING→STANDING for (${playerId}, ${rivalKey}) ` +
        `downstream_condition=${downstreamCondition} >= threshold=${thresholdRef}`,
      );

      return {
        transitioned: true,
        flow_regime: 'standing',
        retaliation_suspended: true, // STANDING suspends rival retaliation scripts (canon §5.2 :71)
        event_type: 'conflict_flow_regime',
      };
    }

    // Not blocked OR already STANDING — no transition
    const regimeAfter: FlowRegime = currentRegime;
    const retaliationSuspended = regimeAfter === 'standing';

    return {
      transitioned: false,
      flow_regime: regimeAfter,
      retaliation_suspended: retaliationSuspended,
      event_type: null,
    };
  }

  /**
   * `transitionRegime` — upsert conflict_flow_state.flow_regime to the given regime.
   *
   * Called by evaluateDownstream on a confirmed RUNNING→STANDING hydraulic jump.
   * Deterministic write — no RNG, no Date.now().
   */
  async transitionRegime(
    playerId: string,
    rivalKey: RivalKey,
    regime: FlowRegime,
  ): Promise<void> {
    await this.combatRepo.upsertConflictFlow(playerId, rivalKey, { flow_regime: regime });
  }

  /**
   * `getConflictFlowRegime` — the §13-PRODUCES method.
   *
   * ★ P5 exception (canon §5.2 :67): the flow_regime is shown EXPLICITLY because it gates the
   * player's strategy. The downstream_condition_bucket (qualitative) is also shown. The raw
   * downstream_condition float is NEVER returned to the player.
   *
   * Returns { flow_regime: string, downstream_condition_bucket: string }.
   *
   * Determinism: pure read + band derivation. NO Math.random(). NO Date.now().
   */
  async getConflictFlowRegime(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ flow_regime: string; downstream_condition_bucket: string }> {
    const flowRow = await this.combatRepo.readConflictFlow(playerId, rivalKey);
    const regime = (flowRow?.flow_regime as FlowRegime) ?? 'running';
    const rawCondition = flowRow?.downstream_condition ?? 0;
    const conditionBucket = mapConditionToBucket(rawCondition);

    return {
      flow_regime: regime,           // shown EXPLICITLY (P5 exception — gates strategy)
      downstream_condition_bucket: conditionBucket,  // qualitative bucket (NOT raw float)
    };
  }
}

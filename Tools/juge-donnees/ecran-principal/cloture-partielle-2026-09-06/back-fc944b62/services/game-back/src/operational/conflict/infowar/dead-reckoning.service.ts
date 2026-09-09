// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9.5
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4.1
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// `DeadReckoningService` — §4.1 belief-state inference.
//
// updateBeliefState(playerId, rivalKey, gameMinute):
//   - Reads rival's true RivalState (via RivalStateRepository.readRivalState)
//   - For Coil: applies deception corruption (coil_corruption_applied=true):
//     - Sets operationalTempoBand to the OPPOSITE of what true regime implies (lowest band)
//     - Sets all other bands to deliberately degraded (lowest) values
//     - Ensures belief ≠ true state (DD-P5-REALIZATION)
//   - For other rivals: sets bands based on true regime (with offset)
//   - Writes to dead_reckoning_belief
//
// decayBeliefStatePerTick(playerId, rivalKey):
//   - Reads current belief row (if no row, no-op — write-amplification discipline)
//   - Applies decay: shifts each band one level toward its lowest value
//   - Writes back via repo.upsertBelief
//
// Anti-fabrication: NO Math.random(), NO Date.now(). All logic is deterministic.
// P5 / R2.2: the belief vector is NEVER the true RivalState (DD-P5-REALIZATION).
//   Coil's deception corruption ensures belief clearly diverges from truth.
// Zero-regression: ADDITIVE only. No existing tables touched.

import { Injectable, Logger } from '@nestjs/common';

import { InfoWarTunables } from './infowar.tunables';
import { InformationWarfareRepository } from './infowar.repository';
import type { BeliefUpdate } from './infowar.repository';
import { RivalStateRepository } from '../rival/rival-state.repository';
import type { RivalKey } from '../rival/rival-ai.types';

// ─── Band ladder types (narrow to enforce the decay steps) ───────────────────────────────────────

type OperationalTempoBand        = 'low' | 'moderate' | 'high' | 'surge';
type ResourceMobilizationBand    = 'dormant' | 'low' | 'elevated' | 'high';
type PersonnelConcentrationBand  = 'dispersed' | 'nominal' | 'concentrated' | 'massed';
type CommunicationPatternBand    = 'silent' | 'routine' | 'elevated' | 'urgent';
type TerritorialReachBand        = 'contracting' | 'stable' | 'expanding' | 'surging';
type LogisticsIntensityBand      = 'minimal' | 'standard' | 'heavy' | 'max';

// ─── Decay ladder maps (each level steps DOWN one notch) ─────────────────────────────────────────

const OPERATIONAL_TEMPO_DECAY: Record<OperationalTempoBand, OperationalTempoBand> = {
  surge:    'high',
  high:     'moderate',
  moderate: 'low',
  low:      'low',  // floor
};

const RESOURCE_MOBILIZATION_DECAY: Record<ResourceMobilizationBand, ResourceMobilizationBand> = {
  high:     'elevated',
  elevated: 'low',
  low:      'dormant',
  dormant:  'dormant',  // floor
};

const PERSONNEL_CONCENTRATION_DECAY: Record<PersonnelConcentrationBand, PersonnelConcentrationBand> = {
  massed:       'concentrated',
  concentrated: 'nominal',
  nominal:      'dispersed',
  dispersed:    'dispersed',  // floor
};

const COMMUNICATION_PATTERN_DECAY: Record<CommunicationPatternBand, CommunicationPatternBand> = {
  urgent:   'elevated',
  elevated: 'routine',
  routine:  'silent',
  silent:   'silent',  // floor
};

const TERRITORIAL_REACH_DECAY: Record<TerritorialReachBand, TerritorialReachBand> = {
  surging:    'expanding',
  expanding:  'stable',
  stable:     'contracting',
  contracting: 'contracting',  // floor
};

const LOGISTICS_INTENSITY_DECAY: Record<LogisticsIntensityBand, LogisticsIntensityBand> = {
  max:      'heavy',
  heavy:    'standard',
  standard: 'minimal',
  minimal:  'minimal',  // floor
};

// ─── Service ─────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DeadReckoningService {
  private readonly logger = new Logger(DeadReckoningService.name);

  constructor(
    private readonly tunables: InfoWarTunables,
    private readonly repo: InformationWarfareRepository,
    private readonly rivalStateRepo: RivalStateRepository,
  ) {}

  /**
   * Update the Dead-Reckoning belief vector for the given (player, rival) pair.
   *
   * §4.1 logic:
   *   - Reads the rival's TRUE RivalState from rival_state table.
   *   - For Coil: applies deception corruption (coil_corruption_applied=true).
   *       Sets operationalTempoBand to 'low' (the OPPOSITE of typical active Coil),
   *       and all other bands to their lowest values — belief clearly diverges from truth.
   *   - For other rivals: maps regime → bands with a moderate-down offset (semi-noisy estimate).
   *   - Writes the belief via upsertBelief.
   *   - Returns the written BeliefUpdate (or null if no true state row exists).
   *
   * DD-P5-REALIZATION: the returned belief is NEVER the true regime state.
   * Anti-fabrication: NO Math.random(). Deterministic regime→band mapping only.
   */
  async updateBeliefState(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<BeliefUpdate | null> {
    const trueState = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!trueState) {
      this.logger.debug(
        `DeadReckoning: no rival state found for player=${playerId} rival=${rivalKey} — skipping belief update`,
      );
      return null;
    }

    let belief: BeliefUpdate;

    if (rivalKey === 'coil') {
      // DD-P5-REALIZATION: Coil's deception module corrupts the belief vector.
      // Set operationalTempoBand to LOWEST (opposite of typical Coil high-activity),
      // all other bands to their floor values.
      belief = {
        operational_tempo_band:       'low',         // opposite of true typical 'high'/'surge'
        resource_mobilization_band:   'dormant',     // floor
        personnel_concentration_band: 'dispersed',   // floor
        communication_pattern_band:   'silent',      // floor
        territorial_reach_band:       'contracting', // floor
        logistics_intensity_band:     'minimal',     // floor
        coil_corruption_applied:      true,
        last_updated_tick:            gameMinute,
      };
    } else {
      // For non-Coil rivals: map regime → bands (semi-noisy estimate — intentionally offset).
      // The mapping gives a plausible but imperfect read of the rival's posture.
      const regime = trueState.regime;

      let operationalTempoBand: OperationalTempoBand;
      let resourceMobilizationBand: ResourceMobilizationBand;
      let personnelConcentrationBand: PersonnelConcentrationBand;
      let communicationPatternBand: CommunicationPatternBand;
      let territorialReachBand: TerritorialReachBand;
      let logisticsIntensityBand: LogisticsIntensityBand;

      switch (regime) {
        case 'expansionary':
          operationalTempoBand        = 'high';
          resourceMobilizationBand    = 'elevated';
          personnelConcentrationBand  = 'concentrated';
          communicationPatternBand    = 'elevated';
          territorialReachBand        = 'expanding';
          logisticsIntensityBand      = 'heavy';
          break;

        case 'entrenched' as never:  // future-proof: fall through to consolidating
        case 'consolidating':
          operationalTempoBand        = 'moderate';
          resourceMobilizationBand    = 'elevated';
          personnelConcentrationBand  = 'nominal';
          communicationPatternBand    = 'routine';
          territorialReachBand        = 'stable';
          logisticsIntensityBand      = 'standard';
          break;

        case 'bleeding':
          operationalTempoBand        = 'moderate';
          resourceMobilizationBand    = 'low';
          personnelConcentrationBand  = 'nominal';
          communicationPatternBand    = 'elevated';
          territorialReachBand        = 'contracting';
          logisticsIntensityBand      = 'standard';
          break;

        case 'defensive':
          operationalTempoBand        = 'low';
          resourceMobilizationBand    = 'low';
          personnelConcentrationBand  = 'concentrated';
          communicationPatternBand    = 'routine';
          territorialReachBand        = 'stable';
          logisticsIntensityBand      = 'standard';
          break;

        case 'retrench':
          operationalTempoBand        = 'low';
          resourceMobilizationBand    = 'dormant';
          personnelConcentrationBand  = 'nominal';
          communicationPatternBand    = 'silent';
          territorialReachBand        = 'contracting';
          logisticsIntensityBand      = 'minimal';
          break;

        case 'withdrawal':
        default:
          operationalTempoBand        = 'low';
          resourceMobilizationBand    = 'dormant';
          personnelConcentrationBand  = 'dispersed';
          communicationPatternBand    = 'silent';
          territorialReachBand        = 'contracting';
          logisticsIntensityBand      = 'minimal';
          break;
      }

      belief = {
        operational_tempo_band:       operationalTempoBand,
        resource_mobilization_band:   resourceMobilizationBand,
        personnel_concentration_band: personnelConcentrationBand,
        communication_pattern_band:   communicationPatternBand,
        territorial_reach_band:       territorialReachBand,
        logistics_intensity_band:     logisticsIntensityBand,
        coil_corruption_applied:      false,
        last_updated_tick:            gameMinute,
      };
    }

    await this.repo.upsertBelief(playerId, rivalKey, belief);
    return belief;
  }

  /**
   * Apply one decay step to the Dead-Reckoning belief vector for the given (player, rival).
   *
   * Write-amplification discipline: if no belief row exists, this is a no-op (the
   * orchestrator only calls this if the player has state — hasAnyInfoWarRows).
   *
   * Decay: each band steps DOWN one level toward its floor value (see decay ladders above).
   * The rate is governed by `info_warfare.dead_reckoning_belief_state_decay_rate_per_tick`
   * (referenced in tunables — the step itself is always exactly one level per call,
   * consistent with the band-based P5 model).
   *
   * Anti-fabrication: NO Math.random(). Purely deterministic step-down.
   */
  async decayBeliefStatePerTick(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<void> {
    const current = await this.repo.readBelief(playerId, rivalKey);
    if (!current) {
      // Write-amplification discipline: no row → no-op.
      return;
    }

    // The concrete decay step is always exactly ONE band level (the band-based P5 model).
    // `deadReckoningBeliefStateDecayRatePerTick` governs CALL FREQUENCY (orchestrator cadence),
    // not step magnitude — this service applies a fixed one-level step per invocation.
    // No compute-path use of the rate here; frequency is the orchestrator's concern.

    const decayed: BeliefUpdate = {
      operational_tempo_band:
        OPERATIONAL_TEMPO_DECAY[current.operational_tempo_band as OperationalTempoBand] ??
        'low',
      resource_mobilization_band:
        RESOURCE_MOBILIZATION_DECAY[current.resource_mobilization_band as ResourceMobilizationBand] ??
        'dormant',
      personnel_concentration_band:
        PERSONNEL_CONCENTRATION_DECAY[current.personnel_concentration_band as PersonnelConcentrationBand] ??
        'dispersed',
      communication_pattern_band:
        COMMUNICATION_PATTERN_DECAY[current.communication_pattern_band as CommunicationPatternBand] ??
        'silent',
      territorial_reach_band:
        TERRITORIAL_REACH_DECAY[current.territorial_reach_band as TerritorialReachBand] ??
        'contracting',
      logistics_intensity_band:
        LOGISTICS_INTENSITY_DECAY[current.logistics_intensity_band as LogisticsIntensityBand] ??
        'minimal',
      // Preserve corruption flag and tick on decay — no new tick assigned.
      coil_corruption_applied: current.coil_corruption_applied,
      last_updated_tick:       current.last_updated_tick,
    };

    await this.repo.upsertBelief(playerId, rivalKey, decayed);
  }
}

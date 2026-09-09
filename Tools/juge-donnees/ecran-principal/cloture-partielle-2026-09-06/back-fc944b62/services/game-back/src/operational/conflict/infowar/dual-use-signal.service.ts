// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9.5
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4.2
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// `DualUseSignalService` — §4.2 BPD-prior interpretation.
//
// recordPlayerAction(playerId, rivalKey, actionType, gameMinute):
//   - actionType: 'combat' | 'territorial' | 'neutral' | 'economic'
//   - Reads BPD prior via policeMemoryService.getPrecinctBeliefRaw(playerId, 1)
//   - Updates rival_interpretation_bias (accumulator — sticky):
//       combat:     += 0.20 (strong attack signal)
//       territorial:+= 0.10
//       neutral:    -= 0.05 (cleans signal)
//       economic:   -= 0.02
//   - Clamps bias to [0..1]
//   - last_bpd_prior_mass = bpdPrior?.totalMass ?? 0
//   - Writes to dual_use_signal_state
//
// computeRivalInterpretation(playerId, rivalKey, gameMinute):
//   - Reads current dual_use_signal_state (treats missing row as bias=0)
//   - Reads BPD prior (READ-ONLY — NO BPD write — DD-BPD-WRITE-SCOPE / DIV-C3)
//   - familiarityWeight = resolveCompositeRef(tunables.dualUseFamiliarityInterpretationWeightBucket, …)
//     → composite:STANDARD ref = 0.45; bpdWeight = prior != null && totalMass > 5 ? familiarityWeight : 0
//   - combinedSignal = bias + bpdWeight
//   - badge = combinedSignal > 0.5 → 'preparation'
//             combinedSignal < 0.2 → 'posture'
//             else → 'ambiguous'
//   - Writes interpretation_badge back to dual_use_signal_state
//   - Returns { badge, bpdPriorUsed }
//
// DD-BPD-WRITE-SCOPE / DIV-C3: this service NEVER writes to BPD/police_memory tables.
// Anti-fabrication: NO Math.random(), NO Date.now(). All logic is deterministic.
// P5 / R2.2: rival_interpretation_bias is SERVER-ONLY. Player sees only interpretation_badge.
// Zero-regression: ADDITIVE only. No existing tables touched.

import { Injectable, Logger } from '@nestjs/common';

import { InfoWarTunables } from './infowar.tunables';
import { InformationWarfareRepository } from './infowar.repository';
import type { DualUseUpdate } from './infowar.repository';
import { PoliceMemoryService } from '../../../citysim/police_memory/police_memory.service';
import type { RivalKey } from '../rival/rival-ai.types';

// ─── Action type union ────────────────────────────────────────────────────────────────────────────

export type DualUseActionType = 'combat' | 'territorial' | 'neutral' | 'economic';

// ── Composite bucket → ref float resolver ────────────────────────────────────────────────────────
// Pattern mirrors credibility-accumulator.service.ts (the C5 precedent for composite ref resolvers).

/** Translate a composite bucket string to its ref float. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0; // safe fallback — a misconfigured bucket becomes a no-op
}

// ── Ref-float maps ─────────────────────────────────────────────────────────────────────────────

// Ref floats for `info_warfare.dual_use_familiarity_interpretation_weight_bucket`.
// Canon :92 — composite:STANDARD → 0.45 (BPD familiarity weight on combined signal).
// [PROV-Y26Q2] HIGH/LOW refs below (no canon band for these; calibration TD).
const DUAL_USE_FAMILIARITY_WEIGHT_REF_MAP: Record<string, number> = {
  'composite:standard': 0.45,
  'composite:high':     0.65, // [PROV-Y26Q2]
  'composite:low':      0.25, // [PROV-Y26Q2]
};

// ─── Canon-structural constants (no gdd/14 registry entries — not balance levers) ───────────────

/**
 * Bias deltas per action type.
 * Canon: information_warfare_mechanics.md §4.2.
 * These are canon-structural (verbatim from the mechanic spec), NOT registry tunables.
 * Calibration TD: if these deltas become tunable, add gdd/14 rows + InfoWarTunables getters.
 */
const BIAS_DELTA: Record<DualUseActionType, number> = {
  combat:      0.20,
  territorial: 0.10,
  neutral:    -0.05,
  economic:   -0.02,
};

/**
 * BPD prior mass threshold above which the BPD weight applies.
 * Canon §4.2 — structural trigger, not a balance lever (no registry entry).
 */
const BPD_MASS_THRESHOLD = 5;

/**
 * Combined-signal threshold above which the badge is 'preparation'. Canon §4.2.
 * Canon-structural: not a registry tunable.
 */
const BADGE_PREPARATION_THRESHOLD = 0.5;

/**
 * Combined-signal threshold below which the badge is 'posture'. Canon §4.2.
 * Canon-structural: not a registry tunable.
 */
const BADGE_POSTURE_THRESHOLD = 0.2;

// ─── Result type ─────────────────────────────────────────────────────────────────────────────────

export interface InterpretationResult {
  badge: 'posture' | 'preparation' | 'ambiguous';
  bpdPriorUsed: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DualUseSignalService {
  private readonly logger = new Logger(DualUseSignalService.name);

  constructor(
    private readonly tunables: InfoWarTunables,
    private readonly repo: InformationWarfareRepository,
    private readonly policeMemoryService: PoliceMemoryService,
  ) {}

  /**
   * Record a player action and accumulate the rival_interpretation_bias.
   *
   * §4.2 logic:
   *   - Reads current bias from dual_use_signal_state (defaults to 0 if no row).
   *   - Applies BIAS_DELTA[actionType] and clamps to [0..1].
   *   - Reads BPD prior for last_bpd_prior_mass (READ-ONLY — no BPD write).
   *   - Writes updated state to dual_use_signal_state.
   *
   * DD-BPD-WRITE-SCOPE: NO write to police_memory tables.
   * Anti-fabrication: NO Math.random().
   */
  async recordPlayerAction(
    playerId: string,
    rivalKey: RivalKey,
    actionType: DualUseActionType,
    gameMinute: number,
  ): Promise<void> {
    // Interpretation lag (dualUseInterpretationLagTicks) governs call cadence from the orchestrator,
    // not step magnitude here. The immediate write is the correct scope for recordPlayerAction.

    // Read current bias (or default to 0).
    const current = await this.repo.readDualUseState(playerId, rivalKey);
    const currentBias = current?.rival_interpretation_bias ?? 0;

    // Apply delta and clamp to [0..1].
    const delta = BIAS_DELTA[actionType];
    const newBias = Math.min(1, Math.max(0, currentBias + delta));

    // Read BPD prior (READ-ONLY).
    const bpdPrior = await this.policeMemoryService.getPrecinctBeliefRaw(playerId, 1);

    const update: DualUseUpdate = {
      action_type:               actionType,
      rival_interpretation_bias: newBias,
      interpretation_badge:      current?.interpretation_badge ?? 'ambiguous',
      last_bpd_prior_mass:       bpdPrior?.totalMass ?? 0,
      last_updated_tick:         gameMinute,
    };

    await this.repo.upsertDualUseState(playerId, rivalKey, update);

    this.logger.debug(
      `DualUseSignal: player=${playerId} rival=${rivalKey} action=${actionType} ` +
      `bias ${currentBias.toFixed(3)} → ${newBias.toFixed(3)}`,
    );
  }

  /**
   * Compute the rival's interpretation badge from the current bias + BPD prior.
   *
   * §4.2 logic:
   *   - Reads current dual_use_signal_state (treats missing row as bias=0).
   *   - Reads BPD prior for precinct 1 (READ-ONLY — no BPD write).
   *   - bpdWeight = totalMass > BPD_MASS_THRESHOLD ? BPD_WEIGHT : 0
   *   - combinedSignal = bias + bpdWeight
   *   - badge:
   *       > BADGE_PREPARATION_THRESHOLD → 'preparation'
   *       < BADGE_POSTURE_THRESHOLD     → 'posture'
   *       else                          → 'ambiguous'
   *   - Writes interpretation_badge to dual_use_signal_state.
   *   - Returns { badge, bpdPriorUsed }.
   *
   * DD-BPD-WRITE-SCOPE / DIV-C3: NO write to BPD tables.
   * Anti-fabrication: NO Math.random().
   */
  async computeRivalInterpretation(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<InterpretationResult> {
    // BPD familiarity weight: getter-sourced via composite bucket → ref float translator.
    // Canon :92 — composite:STANDARD → 0.45. Applied when precinct 1 mass exceeds BPD_MASS_THRESHOLD.
    const familiarityWeight = resolveCompositeRef(
      this.tunables.dualUseFamiliarityInterpretationWeightBucket,
      DUAL_USE_FAMILIARITY_WEIGHT_REF_MAP,
    );

    // Read current state.
    const current = await this.repo.readDualUseState(playerId, rivalKey);
    const bias = current?.rival_interpretation_bias ?? 0;

    // Read BPD prior (READ-ONLY — no BPD write, DD-BPD-WRITE-SCOPE / DIV-C3).
    const bpdPrior = await this.policeMemoryService.getPrecinctBeliefRaw(playerId, 1);
    const bpdPriorUsed = bpdPrior !== null;
    const bpdWeight = bpdPriorUsed && bpdPrior!.totalMass > BPD_MASS_THRESHOLD
      ? familiarityWeight
      : 0;

    const combinedSignal = bias + bpdWeight;

    let badge: InterpretationResult['badge'];
    if (combinedSignal > BADGE_PREPARATION_THRESHOLD) {
      badge = 'preparation';
    } else if (combinedSignal < BADGE_POSTURE_THRESHOLD) {
      badge = 'posture';
    } else {
      badge = 'ambiguous';
    }

    // Write interpretation_badge back to dual_use_signal_state.
    const update: DualUseUpdate = {
      action_type:               current?.action_type ?? 'neutral',
      rival_interpretation_bias: bias,
      interpretation_badge:      badge,
      last_bpd_prior_mass:       bpdPrior?.totalMass ?? 0,
      last_updated_tick:         gameMinute,
    };
    await this.repo.upsertDualUseState(playerId, rivalKey, update);

    this.logger.debug(
      `DualUseSignal: player=${playerId} rival=${rivalKey} ` +
      `bias=${bias.toFixed(3)} bpdWeight=${bpdWeight} combined=${combinedSignal.toFixed(3)} badge=${badge}`,
    );

    return { badge, bpdPriorUsed };
  }
}

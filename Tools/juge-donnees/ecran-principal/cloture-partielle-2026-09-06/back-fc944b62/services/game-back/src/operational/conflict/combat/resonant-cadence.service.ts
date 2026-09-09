// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 9 (C-esc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §4.3
//             Canon: docs/tech/04b_combat_and_conflict/escalation_mechanics.md §4.3 (Resonant Cadence)
//             DD-RESONANCE-GAMETIME OQ-B5 — game-time player_response_history (not wall-clock)
//             — C-esc — 2026-06-25 —
//
// `ResonantCadenceService` — the §4.3 Resonant Cadence mechanic.
//
// Detects when the player's provocation rhythm MATCHES the rival's natural orient cadence —
// causing resonance amplification (escalation accelerates non-linearly at synchronised periods).
//
// Methods:
//   `recordProvocation`              — appends gameMinute to player_response_history (keeps last 10).
//                                       DD-RESONANCE-GAMETIME: GAME-TIME only — NEVER Date.now().
//   `recomputeResonanceFactor`       — recomputes resonance_factor for (player, rival) at gameMinute.
//                                       Similarity = 1 − |avg_interval − rival_period| / max(…).
//                                       Returns { resonanceFactor, amplified }.
//                                       Upserts resonance_factor on escalation_pair_state.
//
// Determinism: NO Math.random(). NO Date.now(). All values from game-state + getters.
// ADDITIVE: only reads/upserts escalation_pair_state. Zero-regression.

import { Injectable, Logger } from '@nestjs/common';

import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import { TempoExposureService } from '../rival/tempo-exposure.service';
import type { RivalKey } from '../rival/rival-ai.types';

// Named constant for resonance threshold (composite:STANDARD → ref 0.70)
const RESONANCE_THRESHOLD_STANDARD_REF = 0.70;  // composite:STANDARD

/** Maximum history length kept in player_response_history. */
const RESPONSE_HISTORY_MAX = 10;

@Injectable()
export class ResonantCadenceService {
  private readonly logger = new Logger(ResonantCadenceService.name);

  constructor(
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
    private readonly tempoExposure: TempoExposureService,
  ) {}

  /**
   * `recordProvocation` — appends `gameMinute` to the player_response_history for (player, rival).
   *
   * DD-RESONANCE-GAMETIME (OQ-B5): history entries are in-game minutes ONLY — NEVER Date.now().
   * Keeps only the most recent RESPONSE_HISTORY_MAX (10) entries. Upserts the pair row.
   *
   * Determinism: NO Math.random(). NO Date.now().
   */
  async recordProvocation(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    const pair = await this.combatRepo.readEscalationPair(playerId, rivalKey);
    const history = (pair?.player_response_history as number[] | null) ?? [];
    // Append and keep only the last RESPONSE_HISTORY_MAX entries
    const newHistory = [...history, gameMinute].slice(-RESPONSE_HISTORY_MAX);
    await this.combatRepo.upsertEscalationPair(playerId, rivalKey, {
      player_response_history: newHistory,
    });
  }

  /**
   * `recomputeResonanceFactor` — recomputes resonance_factor for (player, rival) at `gameMinute`.
   *
   * Algorithm:
   *   1. Reads player_response_history from escalation_pair_state.
   *   2. If < 2 entries → resonanceFactor = 0, amplified = false (insufficient history).
   *   3. Computes average inter-provocation interval from history.
   *   4. Reads rival's effective orient_latency_ticks (rival_period) via TempoExposureService.
   *      Falls back to oscillationCyclePeriodEstimateTicks (default 10) if no rival row.
   *   5. Similarity = 1 - |avg_interval - rival_period| / max(avg_interval, rival_period).
   *   6. resonanceFactor = clamp(0, similarity, 1).
   *   7. amplified = resonanceFactor > resonanceThreshold (composite:STANDARD → ref 0.70).
   *   8. Upserts resonance_factor on escalation_pair_state.
   *
   * Returns { resonanceFactor, amplified }.
   *
   * Determinism: NO Math.random(). NO Date.now(). All values from game-state + getters.
   */
  async recomputeResonanceFactor(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<{ resonanceFactor: number; amplified: boolean }> {
    const pair = await this.combatRepo.readEscalationPair(playerId, rivalKey);
    const history = (pair?.player_response_history as number[] | null) ?? [];

    if (history.length < 2) {
      // Insufficient history — resonance cannot be computed
      return { resonanceFactor: 0, amplified: false };
    }

    // Compute average interval between consecutive provocations
    let totalInterval = 0;
    for (let i = 1; i < history.length; i++) {
      totalInterval += (history[i]! - history[i - 1]!);
    }
    const avgInterval = totalInterval / (history.length - 1);

    // Get rival's effective orient latency window (orient_latency_ticks, cohesion-adjusted)
    const rivalPeriodOrNull = await this.tempoExposure.getOrientLatencyWindow(playerId, rivalKey);
    // Fallback to oscillationCyclePeriodEstimateTicks (default 10) if no rival row exists
    const rivalPeriod = rivalPeriodOrNull !== null
      ? rivalPeriodOrNull
      : this.tunables.oscillationCyclePeriodEstimateTicks;

    // Similarity = 1 - |avg_interval - rival_period| / max(avg_interval, rival_period)
    const diff = Math.abs(avgInterval - rivalPeriod);
    const maxVal = Math.max(avgInterval, rivalPeriod);
    const similarity = maxVal === 0 ? 1 : 1 - diff / maxVal;
    const resonanceFactor = Math.max(0, Math.min(1, similarity));

    // Resolve resonance threshold from getter (composite:STANDARD → ref 0.70)
    const thresholdBucket = this.tunables.resonanceThresholdBucket;
    const threshold = thresholdBucket === 'composite:STANDARD'
      ? RESONANCE_THRESHOLD_STANDARD_REF
      : RESONANCE_THRESHOLD_STANDARD_REF;
    const amplified = resonanceFactor > threshold;

    // Upsert resonance_factor on escalation_pair_state
    await this.combatRepo.upsertEscalationPair(playerId, rivalKey, {
      resonance_factor: resonanceFactor,
    });

    this.logger.debug(
      `ResonantCadence: player=${playerId} rival=${rivalKey} gm=${gameMinute} ` +
      `avgInterval=${avgInterval.toFixed(2)} rivalPeriod=${rivalPeriod} ` +
      `resonanceFactor=${resonanceFactor.toFixed(3)} amplified=${amplified}`,
    );

    return { resonanceFactor, amplified };
  }
}

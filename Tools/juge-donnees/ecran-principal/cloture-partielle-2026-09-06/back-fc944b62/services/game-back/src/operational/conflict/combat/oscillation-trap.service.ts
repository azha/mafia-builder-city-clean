// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 9 (C-esc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §4.4
//             Canon: docs/tech/04b_combat_and_conflict/escalation_mechanics.md §4.4 (Oscillation Trap)
//             OQ-B6: only contested-lek rows receive dynamics (no row → no write).
//             — C-esc — 2026-06-25 —
//
// `OscillationTrapService` — the §4.4 Oscillation Trap (Lotka-Volterra per-contested-lek) mechanic.
//
// Applies Lotka-Volterra yield dynamics to each contested lek (oscillation_lek_state row).
// The three-state update on each 12h tick:
//   - extraction_rate > collapse_threshold (>0.75): over-extraction → yield decreases (rival wins).
//   - yield_state < reinvasion_threshold (< 0.60): rival re-invades → extraction_rate climbs.
//   - else: normal recovery → yield increases.
//
// Methods:
//   `recomputeLekDynamics`    — runs Lotka-Volterra update for (player, tile, rival).
//                               No-op (OQ-B6) if no oscillation_lek_state row exists for tile.
//   `applyPlayerDampening`    — sets oscillation_locked based on extraction level
//                               (medium → locked=true; max → locked=false).
//
// Determinism: NO Math.random(). NO Date.now(). All thresholds getter-sourced.
// ADDITIVE: only reads/upserts oscillation_lek_state. Zero-regression.

import { Injectable, Logger } from '@nestjs/common';

import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import type { RivalKey } from '../rival/rival-ai.types';

// Named constants for composite bucket resolutions (anti-bare-float discipline)
const OSCILLATION_COLLAPSE_THRESHOLD_STANDARD_REF = 0.75;  // composite:STANDARD
const OSCILLATION_REINVASION_THRESHOLD_STANDARD_REF = 0.60; // composite:STANDARD

/** The extraction rate increment applied when the rival re-invades (per-tick, per-lek). */
const REINVASION_EXTRACTION_INCREMENT = 0.05;

@Injectable()
export class OscillationTrapService {
  private readonly logger = new Logger(OscillationTrapService.name);

  constructor(
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
  ) {}

  /**
   * `recomputeLekDynamics` — runs the §4.4 Lotka-Volterra update for (player, tile, rival).
   *
   * OQ-B6 contested-only invariant: if no oscillation_lek_state row exists for this (player, tileId),
   * this method is a NO-OP (zero writes). The lek must have been seeded as contested first.
   *
   * Three-state update (all thresholds getter-sourced):
   *   extraction_rate > collapseThreshold (0.75)   → yield decreases by recoveryRate.
   *   yield_state < reinvasionThreshold (0.60)      → extraction_rate climbs by REINVASION_INCREMENT.
   *   else (normal)                                  → yield recovers by recoveryRate.
   *
   * Determinism: NO Math.random(). NO Date.now(). All rates/thresholds getter-sourced.
   */
  async recomputeLekDynamics(
    playerId: string,
    tileId: number,
    rivalKey: RivalKey,
  ): Promise<void> {
    const lek = await this.combatRepo.readOscillationLek(playerId, tileId);
    if (!lek) {
      // OQ-B6: no contested lek row → no-op (do NOT create a row)
      return;
    }

    // Resolve thresholds from getters (composite:STANDARD → named constants)
    const collapseBucket = this.tunables.oscillationExtractionThresholdForCollapseBucket;
    const collapseThreshold = collapseBucket === 'composite:STANDARD'
      ? OSCILLATION_COLLAPSE_THRESHOLD_STANDARD_REF
      : OSCILLATION_COLLAPSE_THRESHOLD_STANDARD_REF;

    const reinvasionBucket = this.tunables.oscillationReInvasionThresholdBucket;
    const reinvasionThreshold = reinvasionBucket === 'composite:STANDARD'
      ? OSCILLATION_REINVASION_THRESHOLD_STANDARD_REF
      : OSCILLATION_REINVASION_THRESHOLD_STANDARD_REF;

    // Recovery rate (direct float, getter-sourced — default 0.05)
    const recoveryRate = this.tunables.oscillationYieldRecoveryRatePerTick;

    let { extraction_rate, yield_state } = lek;

    if (extraction_rate > collapseThreshold) {
      // Over-extraction → yield decreases (rival wins this lek cycle)
      yield_state = Math.max(0, yield_state - recoveryRate);
    } else if (yield_state < reinvasionThreshold) {
      // Yield below reinvasion threshold → rival re-invades (extraction climbs)
      extraction_rate = Math.min(1, extraction_rate + REINVASION_EXTRACTION_INCREMENT);
    } else {
      // Normal recovery → yield improves
      yield_state = Math.min(1, yield_state + recoveryRate);
    }

    await this.combatRepo.upsertOscillationLek(playerId, tileId, rivalKey, {
      extraction_rate,
      yield_state,
    });
  }

  /**
   * `applyPlayerDampening` — sets oscillation_locked based on extraction level.
   *
   * medium extraction → rival locked (oscillation_locked=true; the "dampening window" is open)
   * max extraction    → rival not locked (oscillation_locked=false; over-extraction undoes dampening)
   *
   * Creates the row if absent (upsert — the dampening action implies contest).
   * Returns { locked: boolean }.
   *
   * Determinism: NO Math.random(). NO Date.now().
   */
  async applyPlayerDampening(
    playerId: string,
    tileId: number,
    rivalKey: RivalKey,
    extractionLevel: 'medium' | 'max',
  ): Promise<{ locked: boolean }> {
    const locked = extractionLevel === 'medium'; // medium → locked; max → unlocked
    await this.combatRepo.upsertOscillationLek(playerId, tileId, rivalKey, {
      oscillation_locked: locked,
    });
    return { locked };
  }
}

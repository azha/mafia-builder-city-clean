// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 9 (C-esc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §4.1
//             Canon: docs/tech/04b_combat_and_conflict/escalation_mechanics.md §4.1 (Sandpile SOC)
//             — C-esc — 2026-06-25 —
//
// `SandpileStateService` — the §4.1 Sandpile self-organised criticality mechanic.
//
// Implements the 12h escalation tick for the sandpile system:
//   `recomputeCriticality` — reads pair rows for the player, sums tension contributions,
//                             updates system_criticality, triggers cascade if above threshold,
//                             applies global decay (floor = hostile_memory_floor at depth >= 7).
//   `triggerCascadeChecks` — runs the seeded draw for propagation; emits CascadeTriggeredEvent
//                             on the bus if propagated=true. Returns propagated boolean.
//   `getSandpileCriticalityBand` — maps raw system_criticality to a qualitative band string.
//
// Determinism: NO Math.random(). NO Date.now(). Seeded draw uses makeRng (plain function, NOT DI).
// P5/R2.2: system_criticality is SERVER-ONLY (band derived for player from CombatProjectionService).
//           CascadeTriggeredEvent carries only qualitative identity (no raw criticality scalar).
// ADDITIVE: no existing table modified. Zero-regression invariant.

import { Injectable, Logger } from '@nestjs/common';

import { makeRng } from '../../../common/seeded-rng';
import { CityEventBus, CascadeTriggeredEvent } from '../../../citysim/events/city-event-bus';
import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import { SaturationBlindnessService } from '../rival/saturation-blindness.service';
import type { RivalKey } from '../rival/rival-ai.types';

// Named constants for composite bucket resolutions (anti-bare-float discipline)
const CASCADE_THRESHOLD_HIGH_REF = 0.8;              // composite:HIGH
const CASCADE_SENSITIVITY_STANDARD_REF = 0.5;        // composite:STANDARD
const CASCADE_PROPAGATION_PROB_STANDARD_REF = 0.45;  // composite:STANDARD

// getSandpileCriticalityBand thresholds (qualitative bands — canon §4.1)
const SANDPILE_BAND_ELEVATED = 0.4;
const SANDPILE_BAND_CRITICAL  = 0.7;

// Hostile memory floor activation depth (depth >= 7 activates floor — canon §4.2)
const HOSTILE_MEMORY_FLOOR_DEPTH = 7;
// The floor value when active (composite:STANDARD ref 0.20 — maladaptive_hostile_memory_floor_bucket)
const HOSTILE_MEMORY_FLOOR_STANDARD_REF = 0.20;  // composite:STANDARD

@Injectable()
export class SandpileStateService {
  private readonly logger = new Logger(SandpileStateService.name);

  constructor(
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
    private readonly eventBus: CityEventBus,
    private readonly saturationBlindness: SaturationBlindnessService,
  ) {}

  /**
   * `recomputeCriticality` — the §4.1 Sandpile 12h update.
   *
   * For the given player at `gameMinute`:
   *   1. Reads escalation_global_state (or starts at criticality=0).
   *   2. Reads all escalation_pair rows for this player.
   *   3. Sums tension contributions (saturation band-weighted: 'suppressed'→0.05 else 0.1).
   *   4. Adds tension × sensitivity to criticality.
   *   5. If above cascade threshold → triggers cascade (seeded draw) + applies decay.
   *   6. Else → applies decay (floor = hostile_memory_floor if deep pair exists, else 0).
   *   7. Upserts escalation_global_state.
   *
   * L1 empty-state: if no pair rows and no global row, criticality stays 0 → no write.
   *   (EscalationTickService handles the early return before calling this method.)
   */
  async recomputeCriticality(playerId: string, gameMinute: number): Promise<void> {
    // Read global state (null = row absent, treat as criticality=0)
    const globalRow = await this.combatRepo.readEscalationGlobal();
    let criticality = globalRow?.system_criticality ?? 0;

    // Read all pair rows for player
    const pairRows = await this.combatRepo.readAllEscalationPairsForPlayer(playerId);

    // Resolve cascade threshold from getter (composite:HIGH → ref 0.8)
    const thresholdBucket = this.tunables.sandpileCascadeThresholdBucket;
    const threshold = thresholdBucket === 'composite:HIGH'
      ? CASCADE_THRESHOLD_HIGH_REF
      : CASCADE_THRESHOLD_HIGH_REF;

    // Resolve cascade sensitivity from getter (composite:STANDARD → ref 0.5)
    const sensitivityBucket = this.tunables.sandpileCascadeSensitivityBucket;
    const sensitivity = sensitivityBucket === 'composite:STANDARD'
      ? CASCADE_SENSITIVITY_STANDARD_REF
      : CASCADE_SENSITIVITY_STANDARD_REF;

    // Check if any pair has depth >= 7 (hostile memory floor activation)
    const hasDeepPair = pairRows.some(p => p.conflict_memory_depth >= HOSTILE_MEMORY_FLOOR_DEPTH);

    // Sum tension contributions from pair rows
    let tensionSum = 0;
    for (const pair of pairRows) {
      try {
        const band = await this.saturationBlindness.getSaturationBand(
          playerId,
          pair.rival_key as RivalKey,
        );
        // 'suppressed' band → 0.05 tension; all other bands → 0.1 tension
        tensionSum += band === 'suppressed' ? 0.05 : 0.1;
      } catch (err) {
        this.logger.warn(
          `SandpileStateService: getSaturationBand failed for ${pair.rival_key} — using 0.1 fallback. ${err}`,
        );
        tensionSum += 0.1;
      }
    }

    // Update criticality += tensionSum * sensitivity
    if (tensionSum > 0) {
      criticality = criticality + tensionSum * sensitivity;
    }

    // Decay rate (getter-sourced — sandpileGlobalDecayRatePerIdleTick, default 0.015)
    const decayRate = this.tunables.sandpileGlobalDecayRatePerIdleTick;
    // Floor = hostile_memory_floor (ref 0.20) if deep pair exists, else 0
    const floor = hasDeepPair ? HOSTILE_MEMORY_FLOOR_STANDARD_REF : 0;

    if (criticality > threshold) {
      // Trigger cascade checks (seeded draw — may emit CascadeTriggeredEvent)
      await this.triggerCascadeChecks(playerId, gameMinute);
      // Apply decay after cascade check
      criticality = Math.max(floor, criticality - decayRate);
    } else {
      // Apply decay (no cascade)
      criticality = Math.max(floor, criticality - decayRate);
    }

    // Upsert global state (always write — criticality updated)
    await this.combatRepo.upsertEscalationGlobal({ system_criticality: criticality });
  }

  /**
   * `triggerCascadeChecks` — the §4.1 seeded cascade draw.
   *
   * Runs a seeded draw against sandpileCascadePropagationProbabilityBucket (composite:STANDARD ref 0.45).
   * If the draw fires: emits CascadeTriggeredEvent on the bus (propagated=true).
   * Returns whether the cascade propagated.
   *
   * Determinism: seed = `cascade:${playerId}:${gameMinute}` → same (player, minute) → same outcome.
   * NO Math.random(). NO Date.now().
   */
  async triggerCascadeChecks(playerId: string, gameMinute: number): Promise<boolean> {
    const probBucket = this.tunables.sandpileCascadePropagationProbabilityBucket;
    const propagationProb = probBucket === 'composite:STANDARD'
      ? CASCADE_PROPAGATION_PROB_STANDARD_REF
      : CASCADE_PROPAGATION_PROB_STANDARD_REF;

    // [PROV-Y26Q2] OQ-B4 resolved: seed composition is `cascade:${playerId}:${gameMinute}`.
    // Design OQ-B4 proposed `cascade:${rivalKey}:${gameDay}` (per-rival, per-day).
    // Implemented as system-level (playerId scope, per-minute) for simplicity at B (one global
    // criticality row, not per-rival); determinism holds — same (playerId, gameMinute) → same
    // outcome. Per-rival cascade seeds deferred to calibration TD if canon requires it.
    const propagated = makeRng(`cascade:${playerId}:${gameMinute}`).chance(propagationProb);

    if (propagated) {
      this.eventBus.emitCascadeTriggered({
        type:        'cascade_triggered',
        playerId,
        gameMinute,
        propagated:  true,
      } satisfies CascadeTriggeredEvent);
    }

    return propagated;
  }

  /**
   * `getSandpileCriticalityBand` — maps raw system_criticality to a qualitative band string.
   *
   * P5 / R2.2: the player sees ONLY the band string, never the raw float.
   *   stable   → criticality < 0.4
   *   elevated → 0.4 <= criticality < 0.7
   *   critical → criticality >= 0.7
   */
  getSandpileCriticalityBand(criticality: number): string {
    if (criticality < SANDPILE_BAND_ELEVATED) return 'stable';
    if (criticality < SANDPILE_BAND_CRITICAL) return 'elevated';
    return 'critical';
  }
}

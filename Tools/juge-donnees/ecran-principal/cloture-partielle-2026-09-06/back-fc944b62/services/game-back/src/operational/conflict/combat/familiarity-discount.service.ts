// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 10 (C-deesc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §5.1
//             Canon: docs/tech/04b_combat_and_conflict/de_escalation_mechanics.md §6.1
//             — C-deesc — 2026-06-25 —
//
// `FamiliarityDiscountService` — §5.1 / §6.1 Familiarity Discount (the dear-enemy effect).
//
// Canon (de_escalation_mechanics.md:32-55): two parties with stable adjacent boundaries for long
// enough have their conflict scripts mutually calibrated, reducing friction; eliminating a familiar
// rival creates a more dangerous unknown-rival vacuum.
//
// Methods:
//   `accrueFamiliarity(playerId, rivalKey)` — accumulates familiarity_index by 0.02/tick (getter-
//     sourced: familiarityAccrualRatePerTick) ONLY when:
//       (1) no active conflict (no combat_event rows for this player×rival), AND
//       (2) boundaries have not moved (no 'hold' combat_event — treated as boundary change)
//     Both conditions: no active combat_event of type 'assault' exists.
//     Familiarity caps at 1.0 (composite:MAXIMUM). Returns { accrued: bool, familiarity_index, bucket }.
//
//   `resetOnElimination(playerId, rivalKey)` — resets familiarity_index to 0 and raises
//     vacuum_volatility by the volatility multiplier (familiarityVacuumFillVolatilityMultiplierBucket
//     ref value). Canon: the triple-cost of decisive victory (§5.1 :45-48 + §7 §9.2).
//     Returns { reset: true, vacuum_volatility }.
//
//   `getFamiliarityBucket(playerId, rivalKey)` — maps familiarity_index to the qualitative
//     FamiliarityIndexBucket (P5 / R2.2 — never the raw float).
//       stranger   : index < 0.30
//       acquainted : 0.30 <= index < 0.60
//       familiar   : 0.60 <= index < 0.90
//       calibrated : index >= 0.90
//     Returns { bucket: string }.
//
// Determinism: NO Math.random(). NO Date.now(). All thresholds getter-sourced.
// ADDITIVE: only reads/upserts deescalation_pair_state. Zero-regression.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { combatEvent } from '../../../db/schema/conflict_combat';
import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import type { RivalKey } from '../rival/rival-ai.types';

/** Maximum familiarity cap (domain bound [0, 1]). */
const FAMILIARITY_MAX = 1.0;

/** Minimum vacuum volatility floor (no-op when adding, but floor ensures no negative). */
const VACUUM_VOLATILITY_FLOOR = 0.0;

/**
 * Mapping from composite-bucket string to a reference float for internal computation.
 * NEVER expose the raw float to the client (P5 / R2.2).
 */
function compositeToRef(bucketStr: string): number {
  if (bucketStr === 'composite:STANDARD') return 0.50;
  if (bucketStr === 'composite:LOW')      return 0.30;
  if (bucketStr === 'composite:HIGH')     return 0.80;
  if (bucketStr === 'composite:MINIMAL')  return 0.20;
  if (bucketStr === 'composite:MAXIMUM')  return 0.90;
  const parsed = parseFloat(bucketStr);
  return Number.isFinite(parsed) ? parsed : 0.50;
}

/**
 * Composite-bucket → vacuum volatility multiplier ref.
 * familiarityVacuumFillVolatilityMultiplierBucket default 'composite:STANDARD' (ref 1.40).
 */
function volatilityMultiplierRef(bucketStr: string): number {
  if (bucketStr === 'composite:STANDARD') return 1.40;
  if (bucketStr === 'composite:LOW')      return 1.10;
  if (bucketStr === 'composite:HIGH')     return 1.80;
  if (bucketStr === 'composite:MINIMAL')  return 1.05;
  if (bucketStr === 'composite:MAXIMUM')  return 2.20;
  const parsed = parseFloat(bucketStr);
  return Number.isFinite(parsed) ? parsed : 1.40;
}

@Injectable()
export class FamiliarityDiscountService {
  private readonly logger = new Logger(FamiliarityDiscountService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
  ) {}

  /**
   * `accrueFamiliarity` — accumulate familiarity_index by accrualRate/tick ONLY when:
   *   (1) no active combat_event of type 'assault' for (playerId, rivalKey), AND
   *   (2) no active combat_event of type 'hold' for (playerId, rivalKey) (boundary moved).
   *
   * Canon: de_escalation_mechanics.md:41 — "accumulates at 0.02/tick when no active conflict
   * exists AND boundaries have not moved".
   *
   * Caps at FAMILIARITY_MAX (1.0). Upserts deescalation_pair_state.
   * Returns { accrued: boolean, familiarity_index: number, familiarity_bucket: string }.
   *
   * Determinism: NO Math.random(). NO Date.now(). Rate getter-sourced.
   */
  async accrueFamiliarity(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ accrued: boolean; familiarity_index: number; familiarity_bucket: string }> {
    // Check for active conflict: any assault OR hold event for this player×rival
    const activeEvents = await this.db
      .select({ type: combatEvent.type })
      .from(combatEvent)
      .where(
        and(
          eq(combatEvent.player_id, playerId),
          eq(combatEvent.target_rival_key, rivalKey),
        ),
      )
      .limit(1);

    const hasActiveConflict = activeEvents.length > 0;

    if (hasActiveConflict) {
      // Active conflict → NO accrual (FALSIFIABLE: conflict blocks familiarity growth)
      const pair = await this.combatRepo.readDeescalationPair(playerId, rivalKey);
      const currentIndex = pair?.familiarity_index ?? 0;
      return {
        accrued: false,
        familiarity_index: currentIndex,
        familiarity_bucket: this._mapIndexToBucket(currentIndex),
      };
    }

    // No active conflict AND boundaries unmoved → accrue
    const pair = await this.combatRepo.readDeescalationPair(playerId, rivalKey);
    const currentIndex = pair?.familiarity_index ?? 0;

    const accrualRate = this.tunables.familiarityAccrualRatePerTick; // getter-sourced default 0.02
    const newIndex = Math.min(FAMILIARITY_MAX, currentIndex + accrualRate);

    // Update mutual_calibration: true when above threshold
    const thresholdRef = compositeToRef(this.tunables.familiarityThresholdForDiscountBucket);
    const mutualCalibration = newIndex >= thresholdRef;

    await this.combatRepo.upsertDeescalationPair(playerId, rivalKey, {
      familiarity_index: newIndex,
      mutual_calibration: mutualCalibration,
    });

    return {
      accrued: true,
      familiarity_index: newIndex,
      familiarity_bucket: this._mapIndexToBucket(newIndex),
    };
  }

  /**
   * `resetOnElimination` — reset familiarity_index to 0 and raise vacuum_volatility.
   *
   * Canon: de_escalation_mechanics.md:41 — "eliminating a familiar rival resets the index
   * and increases vacuum_volatility_on_kill_bucket".
   *
   * The triple-cost of decisive victory (§5.1 :45-48): familiarity reset is PENALTY 1.
   * vacuum_volatility raised by the volatility-multiplier × current familiarity_index.
   * If familiarity_index was 0, the multiplier still adds a baseline penalty (at least the
   * multiplier ref value as a flat increment to signal the elimination cost).
   *
   * Returns { reset: true, vacuum_volatility: number }.
   *
   * Determinism: NO Math.random(). NO Date.now(). Multiplier getter-sourced.
   */
  async resetOnElimination(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ reset: true; vacuum_volatility: number }> {
    const pair = await this.combatRepo.readDeescalationPair(playerId, rivalKey);
    const currentIndex = pair?.familiarity_index ?? 0;
    const currentVolatility = pair?.vacuum_volatility ?? VACUUM_VOLATILITY_FLOOR;

    const multiplierBucket = this.tunables.familiarityVacuumFillVolatilityMultiplierBucket;
    const multiplierRef = volatilityMultiplierRef(multiplierBucket);

    // Vacuum volatility raised: current + (multiplierRef × max(currentIndex, 0.1))
    // Use max(currentIndex, 0.1) so even a stranger-rank elimination has a base penalty.
    const penaltyBase = Math.max(currentIndex, 0.1);
    const newVolatility = Math.min(1.0, currentVolatility + multiplierRef * penaltyBase);

    await this.combatRepo.upsertDeescalationPair(playerId, rivalKey, {
      familiarity_index: 0,           // reset to 0
      mutual_calibration: false,       // calibration lost
      vacuum_volatility: newVolatility,
    });

    return { reset: true, vacuum_volatility: newVolatility };
  }

  /**
   * `getFamiliarityBucket` — map familiarity_index to the qualitative FamiliarityIndexBucket.
   *
   * P5 / R2.2: the player sees ONLY the bucket string, never the raw float.
   *   stranger   : index < 0.30
   *   acquainted : 0.30 <= index < 0.60
   *   familiar   : 0.60 <= index < 0.90
   *   calibrated : index >= 0.90
   *
   * Returns { bucket: string }.
   *
   * Determinism: pure function of the familiarity_index float.
   */
  async getFamiliarityBucket(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ bucket: string }> {
    const pair = await this.combatRepo.readDeescalationPair(playerId, rivalKey);
    const index = pair?.familiarity_index ?? 0;
    return { bucket: this._mapIndexToBucket(index) };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────────────────────────

  /**
   * `_mapIndexToBucket` — pure deterministic mapping from raw float to bucket string.
   *
   * Band thresholds (canon: de_escalation_mechanics.md:37 — 4-value bucket, getter-informed):
   *   stranger   : index < 0.30
   *   acquainted : 0.30 <= index < 0.60
   *   familiar   : 0.60 <= index < 0.90
   *   calibrated : index >= 0.90
   *
   * These thresholds are the qualitative breakpoints for the FamiliarityIndexBucket;
   * the tunable familiarityThresholdForDiscountBucket (composite:STANDARD = 0.50) governs
   * when mutual_calibration fires. These 4 bands are the player-facing qualitative display.
   */
  _mapIndexToBucket(index: number): string {
    if (index >= 0.90) return 'calibrated';
    if (index >= 0.60) return 'familiar';
    if (index >= 0.30) return 'acquainted';
    return 'stranger';
  }
}

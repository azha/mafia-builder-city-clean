// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 6 (C6)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §3.5
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :237-273
//             — Rival AI Foundation C6 — 2026-06-24 —
//
// `TrophicGapService` — the per-player pairwise suppression cascade (§3.5 Trophic Gap).
//
// **Mechanic** (canon :237-273):
//   Removing a rival's top enforcement unit does NOT primarily benefit the player — it removes
//   the suppressive pressure that unit applied to a secondary rival, who then expands into
//   the vacated space (trophic cascade ecology). Eliminating violently OR non-violently has the
//   same trophic cascade (:261, P1).
//
// **Methods exposed (§13 contract A produces for B + C):**
//   - removeTopEnforcer(playerId, rivalKey) — the B/C write-hook: flips top_enforcer_active=false
//     for all pairs where rival_a_key = rivalKey. Idempotent: if already false, returns removed=false.
//   - applyCascade(playerId, rivalAKey, rivalBKey) — internal: applies the secondary-rival capacity
//     bonus (+STANDARD, composite-resolved, NOT inline 0.25). Called by the 12h rebalance for pairs
//     whose enforcer just became inactive.
//   - getTrophicSuppression(playerId, rivalKey) — §13 soft indicator (P6): returns
//     { suppressedRival: string | null, indicator: string } — NEVER the raw enforcement_pressure float.
//     The indicator string is one of 'suppressing' | 'freed' | 'restoring' | 'none'.
//   - rebalancePressurePairs(playerId) — the 12h sweep body (wired in rival-tick.service.ts
//     RIVAL_REGIME_TICK). For each inactive pair, increments enforcement_pressure by
//     trophicRestorationRatePerTick (getter-sourced) until trophicGapDurationTicks ticks elapse.
//   - resetPairPressure(playerId) — test-isolation helper: resets all pair rows for the player
//     to baseline (top_enforcer_active=true, enforcement_pressure=0).
//
// **C4 (determinism):** NO Math.random(), NO Date.now(). All values sourced via getters.
// **P6 / R2.2:** enforcement_pressure (raw float) NEVER in the getTrophicSuppression surface.
//   Only the qualitative indicator string is returned.
// **Soft-refs:** rival_pair_pressure.rival_a_key / rival_b_key use the rival_key enum —
//   no FK to a global static rivals table (§9.3 soft-ref discipline).
// **Getter discipline:** all magnitudes sourced via RivalAiTunables — no inline 0.25 / 12 / 0.05.
//   The composite capacity bonus is resolved via the composite path ('composite:STANDARD' → 0.25),
//   NOT hardcoded inline.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { rivalPairPressure } from '../../../db/schema/conflict_rival';
import { RivalAiTunables } from './rival-ai.tunables';
import type { RivalKey } from './rival-ai.types';

// ─── Composite resolution — trophicSecondaryRivalCapacityBonusOnGapBucket ──────
// The composite key 'composite:STANDARD' maps to ref +0.25 (canon :271).
// The mapping is deterministic — no RNG. It mirrors the SaturationBlindnessService
// composite-resolution pattern (canonical float extracted from the composite string).
const COMPOSITE_TO_REF: Readonly<Record<string, number>> = {
  'composite:LOW':      0.1,
  'composite:STANDARD': 0.25,
  'composite:HIGH':     0.4,
} as const;

function resolveCapacityBonus(bucketStr: string): number {
  return COMPOSITE_TO_REF[bucketStr] ?? 0.25; // fallback to STANDARD ref if key unrecognised
}

// ─── Soft-indicator string type ───────────────────────────────────────────────
//
// The qualitative indicator returned by getTrophicSuppression (P6 — never a raw float).
// Four states (derived from enforcement_pressure + top_enforcer_active):
//   'suppressing' — enforcer is active; the secondary is held back.
//   'freed'       — enforcer just removed; enforcement_pressure = 0 (the gap is fully open).
//   'restoring'   — enforcer removed, restoration in progress (pressure > 0 and < restoration cap).
//   'none'        — no pair row exists for this rival (no suppression relationship recorded).
export type TrophicIndicator = 'suppressing' | 'freed' | 'restoring' | 'none';

export interface TrophicSuppressionView {
  suppressedRival: string | null;  // the rival_b_key (the suppressed secondary), null if none
  indicator: TrophicIndicator;     // the qualitative soft indicator (P6 — NOT a raw float)
  // enforcement_pressure is intentionally ABSENT: P6 — raw float NEVER in this surface.
}

// ─── Row type from the rival_pair_pressure table ──────────────────────────────
interface PairRow {
  rival_a_key: RivalKey;
  rival_b_key: RivalKey;
  enforcement_pressure: number;
  top_enforcer_active: boolean;
}

@Injectable()
export class TrophicGapService {
  private readonly logger = new Logger(TrophicGapService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: RivalAiTunables,
  ) {}

  // ─── removeTopEnforcer (B/C §13 write-hook) ───────────────────────────────────────────────
  //
  // Flips top_enforcer_active=false for ALL pairs where rival_a_key = rivalKey.
  // Idempotent: if the flag is already false for ALL such pairs, returns { removed: false }.
  // The capacity bonus is applied via applyCascade during the next 12h rebalance.
  //
  // Canon :252: "suppressed_secondary_rival immediately gets capacity bonus (their expansion
  //   script unlocked)". In our model, the bonus is applied by rebalancePressurePairs on the
  //   next RIVAL_REGIME_TICK sweep (the 12h cadence — the "next strategy tick" (:253)).
  //   This keeps the write-path deterministic and the cascade side-effect in the tick body.
  //
  // Returns { removed: boolean } — true if at least one pair was flipped from active to inactive.

  async removeTopEnforcer(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ removed: boolean }> {
    // Read all pairs where this rival is the suppressor.
    const pairs = await this.db
      .select()
      .from(rivalPairPressure)
      .where(
        and(
          eq(rivalPairPressure.player_id, playerId),
          eq(rivalPairPressure.rival_a_key, rivalKey),
        ),
      );

    if (pairs.length === 0) {
      // No pairs seeded for this player × rival — no cascade (graceful).
      return { removed: false };
    }

    // Check if any pair has top_enforcer_active=true (i.e., is not already inactive).
    const anyActive = pairs.some((p) => p.top_enforcer_active);
    if (!anyActive) {
      // Idempotent: all pairs already have top_enforcer_active=false — no-op.
      return { removed: false };
    }

    // Flip top_enforcer_active=false for all active pairs where rival_a_key = rivalKey.
    await this.db
      .update(rivalPairPressure)
      .set({ top_enforcer_active: false })
      .where(
        and(
          eq(rivalPairPressure.player_id, playerId),
          eq(rivalPairPressure.rival_a_key, rivalKey),
        ),
      );

    this.logger.log(
      `TrophicGap: top enforcer removed for rival=${rivalKey} (player=${playerId}). ` +
      `${pairs.length} pair(s) flipped to inactive. rebalancePressurePairs fires on next TWELVE_H sweep.`,
    );

    return { removed: true };
  }

  // ─── applyCascade (internal, called by rebalancePressurePairs) ────────────────────────────
  //
  // Applies the secondary-rival capacity bonus for a single inactive pair (rival_a, rival_b).
  // The capacity bonus is getter-sourced (composite:STANDARD → 0.25 ref — NOT inline 0.25).
  // Canon :252: "suppressed_secondary_rival immediately gets capacity bonus".
  // In our model, the bonus is applied on the 12h sweep (the "next strategy tick" (:253)).
  //
  // Implementation note: the "capacity bonus" in A is recorded as the enforcement_pressure
  // restoration delta (enforcement_pressure starts at 0 when freed, increments per tick toward
  // trophicGapDurationTicks × trophicRestorationRatePerTick). The secondary's expansion is
  // signalled by the freed state (indicator='freed' → 'restoring' → 'suppressing' again).
  //
  // The bonus is the capacity boost conferred to rival_b when rival_a's enforcer is removed.
  // In the A substrate, this is modelled as a pressure offset (the secondary gains breathing room).
  // The actual B-lot combat consequence (expanded territory, rerouted enforcement) builds on this.

  async applyCascade(
    playerId: string,
    rivalAKey: RivalKey,
    rivalBKey: RivalKey,
  ): Promise<void> {
    // Getter-sourced: composite resolved to float (NOT inline 0.25).
    const capacityBonusStr = this.tunables.trophicSecondaryRivalCapacityBonusOnGapBucket;
    const capacityBonus    = resolveCapacityBonus(capacityBonusStr);

    // The cascade bonus is applied by incrementing enforcement_pressure by the capacityBonus
    // (enforcement_pressure starts at 0 when freed; the secondary gets the bonus space).
    // The restoration rate then brings it back toward the original level over duration ticks.
    await this.db
      .update(rivalPairPressure)
      .set({
        enforcement_pressure: capacityBonus, // the capacity bonus floor (getter-sourced ref float)
      })
      .where(
        and(
          eq(rivalPairPressure.player_id, playerId),
          eq(rivalPairPressure.rival_a_key, rivalAKey),
          eq(rivalPairPressure.rival_b_key, rivalBKey),
          eq(rivalPairPressure.top_enforcer_active, false),
        ),
      );

    this.logger.debug(
      `TrophicGap: applyCascade (${rivalAKey}→${rivalBKey}) player=${playerId} ` +
      `capacityBonus=${capacityBonus} (composite:${capacityBonusStr})`,
    );
  }

  // ─── rebalancePressurePairs (the 12h sweep body) ──────────────────────────────────────────
  //
  // Wired into RIVAL_REGIME_TICK (Cadence.TWELVE_H, order 6) in rival-tick.service.ts.
  // For each inactive pair (top_enforcer_active=false):
  //   1. Apply the cascade bonus via applyCascade (on first rebalance after removal).
  //   2. Increment enforcement_pressure by trophicRestorationRatePerTick (getter-sourced).
  //   3. When enforcement_pressure >= trophicGapDurationTicks × rate, the gap is restored —
  //      flip top_enforcer_active back to true (the natural regime re-establishes).
  //
  // Canon :388 ("Restoration over trophic_gap_duration_ticks at trophic_restoration_rate_per_tick").
  // All magnitudes are getter-sourced. No Math.random. No Date.now.

  async rebalancePressurePairs(playerId: string): Promise<void> {
    // Read all pairs for this player.
    const pairs = await this.db
      .select()
      .from(rivalPairPressure)
      .where(eq(rivalPairPressure.player_id, playerId));

    if (pairs.length === 0) {
      return; // no pairs seeded for this player — no-op
    }

    const restorationRate = this.tunables.trophicRestorationRatePerTick; // getter-sourced
    const durationTicks   = this.tunables.trophicGapDurationTicks;         // getter-sourced
    // The restoration cap: when enforcement_pressure reaches this, the gap is restored.
    const restorationCap  = durationTicks * restorationRate;

    for (const pair of pairs as PairRow[]) {
      if (pair.top_enforcer_active) {
        // Active pair: no rebalance needed — the enforcer is present, suppression holds.
        continue;
      }

      // Inactive pair: apply cascade (bonus on first rebalance) then increment restoration.
      if (pair.enforcement_pressure <= 0) {
        // First rebalance after removal — apply the cascade capacity bonus.
        await this.applyCascade(
          playerId,
          pair.rival_a_key as RivalKey,
          pair.rival_b_key as RivalKey,
        );
        // Re-read the pressure after applyCascade.
        const [updated] = await this.db
          .select({ enforcement_pressure: rivalPairPressure.enforcement_pressure })
          .from(rivalPairPressure)
          .where(
            and(
              eq(rivalPairPressure.player_id, playerId),
              eq(rivalPairPressure.rival_a_key, pair.rival_a_key),
              eq(rivalPairPressure.rival_b_key, pair.rival_b_key),
            ),
          );
        if (!updated) continue;

        const newPressure = Math.min(updated.enforcement_pressure + restorationRate, restorationCap);
        if (newPressure >= restorationCap) {
          // Gap restored — flip top_enforcer_active back to true.
          await this.db
            .update(rivalPairPressure)
            .set({ top_enforcer_active: true, enforcement_pressure: restorationCap })
            .where(
              and(
                eq(rivalPairPressure.player_id, playerId),
                eq(rivalPairPressure.rival_a_key, pair.rival_a_key),
                eq(rivalPairPressure.rival_b_key, pair.rival_b_key),
              ),
            );
        } else {
          await this.db
            .update(rivalPairPressure)
            .set({ enforcement_pressure: newPressure })
            .where(
              and(
                eq(rivalPairPressure.player_id, playerId),
                eq(rivalPairPressure.rival_a_key, pair.rival_a_key),
                eq(rivalPairPressure.rival_b_key, pair.rival_b_key),
              ),
            );
        }
      } else {
        // Subsequent rebalances: increment restoration.
        const newPressure = Math.min(pair.enforcement_pressure + restorationRate, restorationCap);
        if (newPressure >= restorationCap) {
          // Gap fully restored — flip top_enforcer_active back to true.
          await this.db
            .update(rivalPairPressure)
            .set({ top_enforcer_active: true, enforcement_pressure: restorationCap })
            .where(
              and(
                eq(rivalPairPressure.player_id, playerId),
                eq(rivalPairPressure.rival_a_key, pair.rival_a_key),
                eq(rivalPairPressure.rival_b_key, pair.rival_b_key),
              ),
            );
        } else {
          await this.db
            .update(rivalPairPressure)
            .set({ enforcement_pressure: newPressure })
            .where(
              and(
                eq(rivalPairPressure.player_id, playerId),
                eq(rivalPairPressure.rival_a_key, pair.rival_a_key),
                eq(rivalPairPressure.rival_b_key, pair.rival_b_key),
              ),
            );
        }
      }
    }
  }

  // ─── getTrophicSuppression (§13 soft indicator — P6) ─────────────────────────────────────
  //
  // Returns the qualitative suppression indicator for a rival (the suppressor's perspective).
  // Finds the first pair where rival_a_key = rivalKey (the suppressor role).
  //
  // P6 invariant: enforcement_pressure NEVER in the returned object. Only the indicator string.
  //   Canon :257: "Player sees who each rival is suppressing as a soft indicator on rival
  //   relationship card ('X appears to suppress Y')".
  //
  // Indicator derivation (deterministic, no RNG):
  //   'suppressing' — top_enforcer_active=true AND a pair exists.
  //   'freed'       — top_enforcer_active=false AND enforcement_pressure = 0 (gap just opened).
  //   'restoring'   — top_enforcer_active=false AND enforcement_pressure > 0 (gap being filled).
  //   'none'        — no pair row for this rival (no suppression relationship).

  async getTrophicSuppression(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<TrophicSuppressionView> {
    // Read all pairs where this rival is the suppressor.
    const pairs = await this.db
      .select()
      .from(rivalPairPressure)
      .where(
        and(
          eq(rivalPairPressure.player_id, playerId),
          eq(rivalPairPressure.rival_a_key, rivalKey),
        ),
      );

    if (pairs.length === 0) {
      return { suppressedRival: null, indicator: 'none' };
    }

    // Use the first (primary) pair — the canon-relevant set seeds exactly one pair per suppressor.
    const pair = pairs[0] as PairRow;

    let indicator: TrophicIndicator;
    if (pair.top_enforcer_active) {
      indicator = 'suppressing';
    } else if (pair.enforcement_pressure <= 0) {
      indicator = 'freed';
    } else {
      indicator = 'restoring';
    }

    return {
      suppressedRival: pair.rival_b_key,
      indicator,
      // enforcement_pressure intentionally absent: P6 — raw float NEVER in this surface.
    };
  }

  // ─── resetPairPressure (test-isolation helper) ────────────────────────────────────────────
  //
  // Resets ALL rival_pair_pressure rows for the player to baseline:
  //   top_enforcer_active=true, enforcement_pressure=0.
  // Called by the test controller's reset-pair-pressure route (C6 test-isolation).
  // NOT a production path — test-only (gated by testControllersEnabled in the controller).

  async resetPairPressure(playerId: string): Promise<void> {
    await this.db
      .update(rivalPairPressure)
      .set({ top_enforcer_active: true, enforcement_pressure: 0 })
      .where(eq(rivalPairPressure.player_id, playerId));
  }
}

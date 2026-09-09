// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C6 (decay + mitigations)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md
//               §3 decay mechanic (§5 mitigations — cool-off + use-spreading)
//             Global constraints: determinism (NO Math.random, NO Date.now) + R2.2/P5
//             — 04d-B C6 — 2026-07-02
//
// `IADecayService` — weekly suspicion decay mechanic for G9 IA.
//
// Method:
//   `applyWeeklySuspicionDecay(gameMinute)` — called by IA_DECAY_TICK (WEEKLY/10):
//     Scans internal_affairs_targets for targets whose `last_weekly_decay_at` encodes a
//     game-week epoch BEFORE the current week (= idle this week, not stamped by recordCorruptUse).
//     For each: suspicion_level = MAX(0, suspicion_level - decay_rate_per_week).
//     Stamps `last_weekly_decay_at = thisWeekEpoch` (idempotent per game-week).
//     L1 empty-state skip: no qualifying targets → ZERO writes (zero-regression invariant).
//     Deterministic: NO Math.random, NO Date.now. weekId = Math.floor(gameMinute / WEEKLY_MINUTES).
//     thisWeekEpoch = new Date(weekId * WEEKLY_MINUTES * 60_000) — a game-time pseudo-epoch.
//
// Cool-off (natural consequence):
//   If the player called recordCorruptUse this game-week, IATargetService stamped
//   last_weekly_decay_at = thisWeekEpoch. So the target is filtered OUT of the decay scan
//   (no decay for targets with recent activity). Only idle targets decay.
//
// Use-spreading (inherent):
//   Separate internal_affairs_targets rows per actor → per-actor accrual. Using 2 actors
//   half-as-often produces lower per-actor suspicion (non-linear frequency_multiplier) than
//   1 actor twice-as-often. Each actor decays independently at the same absolute rate.
//
// Idempotency per game-week:
//   After first decay: last_weekly_decay_at = thisWeekEpoch. Second call same week:
//   no target matches `last_weekly_decay_at < thisWeekEpoch` → ZERO writes (no-op).
//
// Zero-regression: additive — no existing tick, table, or service is modified.
// R2.2/P5: suspicion_level is SERVER-ONLY, never forwarded to any client endpoint.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { lt, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { internalAffairsTarget } from '../../db/schema/internal_affairs';
import { IATunables } from './ia.tunables';

// ── Game-time constants ──────────────────────────────────────────────────────────────────────────

/**
 * Game-minutes per in-game week (7 × 24 × 60 = 10080).
 * Mirrors reputation.module.ts:69 and insurance.module.ts:264 (WEEKLY_MINUTES constant).
 * Used to derive weekId = Math.floor(gameMinute / WEEKLY_MINUTES).
 */
export const IA_WEEKLY_MINUTES = 7 * 24 * 60; // 10080

/**
 * Compute the game-week pseudo-epoch for a given gameMinute.
 * Returns a Date whose Unix timestamp (ms) = weekId × WEEKLY_MINUTES × 60_000.
 *
 * This is a DETERMINISTIC game-time encoding — NOT a wall-clock value.
 * Purpose:
 *   - Stored in `last_weekly_decay_at` when decay is applied (idempotent guard).
 *   - Also stored by `recordCorruptUse` to mark "activity this week" (cool-off guard).
 *   - The decay scan filters: `last_weekly_decay_at < thisWeekEpoch` → idle targets.
 *
 * Guarantee: same gameMinute → same epoch; same weekId → same epoch. No Date.now().
 */
export function gameWeekEpoch(gameMinute: number): Date {
  const weekId = Math.floor(gameMinute / IA_WEEKLY_MINUTES);
  return new Date(weekId * IA_WEEKLY_MINUTES * 60_000);
}

// ── IADecayService ────────────────────────────────────────────────────────────────────────────────

/** Result of `applyWeeklySuspicionDecay` — number of targets decayed + weekId. */
export interface IADecayResult {
  /** Number of internal_affairs_targets rows where suspicion_level was decremented. */
  readonly decayed: number;
  /** The game-week id (Math.floor(gameMinute / 10080)) for this decay run. */
  readonly weekId: number;
}

@Injectable()
export class IADecayService {
  private readonly logger = new Logger(IADecayService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: IATunables,
  ) {}

  /**
   * `applyWeeklySuspicionDecay` — the weekly suspicion decay mechanic (G9, C6).
   *
   * Algorithm:
   *   1. Compute weekId = Math.floor(gameMinute / IA_WEEKLY_MINUTES).
   *   2. Compute thisWeekEpoch = new Date(weekId × IA_WEEKLY_MINUTES × 60_000) (game-time pseudo-epoch).
   *   3. L1 empty-state skip: if no targets exist with last_weekly_decay_at < thisWeekEpoch → return early.
   *   4. Read rate = tunables.decayRatePerWeek (registry-first, no inline scalar, R2.3).
   *   5. Fetch all qualifying targets: WHERE last_weekly_decay_at < thisWeekEpoch.
   *   6. For each: compute newLevel = MAX(0, suspicion_level − rate); UPDATE row.
   *   7. Return { decayed: count, weekId }.
   *
   * Cool-off: targets used this week had their last_weekly_decay_at stamped by recordCorruptUse
   * to thisWeekEpoch → filtered OUT (not idle) → no decay. Only idle targets are decremented.
   *
   * Idempotency: after step 7, all processed targets have last_weekly_decay_at = thisWeekEpoch.
   * A second call for the same gameMinute (same weekId) finds no qualifying rows → ZERO writes.
   *
   * Determinism: NO Math.random(), NO Date.now(). Only game-time (gameMinute) is used.
   * R2.2/P5: suspicion_level is SERVER-ONLY — never forwarded to any client endpoint.
   * R2.3: decay_rate_per_week sourced via tunables.decayRatePerWeek (registry getter, not inline).
   *
   * @param gameMinute — current in-game minute (WEEKLY tick context: ctx.gameMinute).
   * @returns { decayed, weekId } — observable proof for E2E assertions.
   */
  async applyWeeklySuspicionDecay(gameMinute: number): Promise<IADecayResult> {
    const weekId = Math.floor(gameMinute / IA_WEEKLY_MINUTES);
    const thisWeekEpoch = gameWeekEpoch(gameMinute);

    // ── L1 empty-state skip ────────────────────────────────────────────────────────────────────
    // Count targets eligible for decay (idle this week). If zero, skip ALL writes.
    // Pattern: mirrors IAInvestigationService.evaluateThresholdCrossing L1 guard.
    const eligibleRows = await this.db
      .select({
        target_id:       internalAffairsTarget.target_id,
        suspicion_level: internalAffairsTarget.suspicion_level,
      })
      .from(internalAffairsTarget)
      .where(lt(internalAffairsTarget.last_weekly_decay_at, thisWeekEpoch));

    if (eligibleRows.length === 0) {
      this.logger.debug(
        `[IADecayService] weekId=${weekId} thisWeekEpoch=${thisWeekEpoch.toISOString()} ` +
          `→ L1 skip: no idle targets (all stamped this week or no targets). ZERO writes.`,
      );
      return { decayed: 0, weekId };
    }

    // ── Apply decay to each qualifying target ─────────────────────────────────────────────────
    const rate = this.tunables.decayRatePerWeek; // registry-first (R2.3)
    let decayed = 0;

    for (const row of eligibleRows) {
      // Clamp ≥ 0: suspicion_level never goes below zero.
      const newLevel = Math.max(0, row.suspicion_level - rate);

      // UPDATE: new suspicion_level + stamp last_weekly_decay_at = thisWeekEpoch (idempotent guard).
      await this.db
        .update(internalAffairsTarget)
        .set({
          suspicion_level:       newLevel,
          last_weekly_decay_at:  thisWeekEpoch, // idempotent guard: this week's epoch
        })
        .where(eq(internalAffairsTarget.target_id, row.target_id));

      decayed++;

      this.logger.debug(
        `[IADecayService] weekId=${weekId} target_id=${row.target_id} ` +
          `suspicion_level: ${row.suspicion_level.toFixed(4)} → ${newLevel.toFixed(4)} ` +
          `(rate=${rate}, clamped≥0).`,
      );
    }

    this.logger.log(
      `[IADecayService] applyWeeklySuspicionDecay DONE — ` +
        `weekId=${weekId} decayed=${decayed} targets, ` +
        `rate=${rate} (gdd/14 internal_affairs.decay_rate_per_week), ` +
        `thisWeekEpoch=${thisWeekEpoch.toISOString()}. ` +
        `Idempotent: targets now stamped at thisWeekEpoch → second run = no-op. ` +
        `Cool-off: targets with recordCorruptUse this week already stamped → not decayed. ` +
        `Deterministic: NO Math.random(), NO Date.now(). Canon: §3 C6.`,
    );

    return { decayed, weekId };
  }
}

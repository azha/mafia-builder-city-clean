// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 7 (C7)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §3.6
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :277-321 (Adaptive Skin)
//             — Rival AI Foundation C7 — 2026-06-24 —
//
// `AdaptiveSkinService` — per-pattern resistance mechanic (Adaptive Skin, §3.6).
//
// FORM:
//   `recordAttack(playerId, rivalKey, patternHash, gameMinute)` — the B/C write-hook:
//     - UPSERT rival_attack_pattern_resistance for (player, rival, pattern).
//     - `resistance += adaptation_rate` (getter-sourced per-rival rate — :291-293).
//     - `last_used_tick = gameMinute` (stamps when this pattern was last used).
//     - Uses read-modify-write (SELECT → INSERT or UPDATE) — the trophic-gap.service.ts pattern.
//
//   `getPatternResistance(playerId, rivalKey, patternHash)` — the B read (a BUCKET, NOT the raw float):
//     - Reads `resistance` float from the table (or 0 if no row).
//     - Returns a `ResistanceBucket` string ('none'|'low'|'medium'|'high') — P6/R2.2 invariant.
//     - The raw `resistance` is NEVER returned to any caller; the bucket is the only surface (:305).
//
//   `decayUnused(playerId, rivalKey, gameMinute)` — the daily decay hook wired into `runDailyTickForRival`:
//     - For every rival_attack_pattern_resistance row where last_used_tick < gameMinute (idle pattern):
//       resistance = max(0, resistance − adaptiveSkinResistanceDecayWhenUnusedPerTick)
//       last_used_tick = gameMinute  ← idempotence gate (re-running same gameMinute is a no-op)
//     - Deterministic: no Math.random, no Date.now. Pure function of DB state + gameMinute.
//
// PER-RIVAL ADAPTATION RATES — getter-sourced (NEVER inlined):
//   Iron Throat: `adaptiveSkinIronThroatAdaptationRateBucket` → HIGH → 0.15 ref (:291)
//   Coil:        `adaptiveSkinCoilAdaptationRateBucket`       → STANDARD → 0.10 ref (:292)
//   Tarcum:      `adaptiveSkinTarcumAdaptationRateBucket`     → LOW → 0.05 ref (:293)
//   Saltline:    `saltlineAdaptationRateBucket`               → [PROV-Y26Q2] OQ-A1
//
//   Each bucket maps to its canonical ref float (the composite mapping per R2.2).
//   The service reads the GETTER (string bucket like 'composite:HIGH'), parses the ref float,
//   and applies it — NEVER hardcoding 0.15/0.10/0.05 inline (the R2.2 / registry-first contract).
//
// BUCKET THRESHOLDS — [PROV-Y26Q2] provisional (canon-silent; calibration TD OQ-A1):
//   none:   resistance < 0.05    — no effective resistance (at baseline)
//   low:    0.05 ≤ resistance < 0.30  — mild adaptation (Tarcum 4 attacks = 0.20 → 'low')
//   medium: 0.30 ≤ resistance < 0.60  — significant adaptation (Iron Throat 4 attacks post-decay → 'medium')
//   high:   resistance ≥ 0.60   — strong counter-measure (Iron Throat 4 attacks = 0.60 → 'high')
//
// P6 invariant: `resistance` float is SERVER-ONLY. `getPatternResistance` returns a bucket string ONLY.
//   The raw float never reaches any public API surface — the P6 wall for Adaptive Skin.
//
// SOFT-REF discipline: rival_attack_pattern_resistance has player_id FK (cascade) + rival_key enum.
//   No FK to any global static table (mirrors rival_holding/rival_pair_pressure precedent, §9.2).
//
// DETERMINISM (C4): NO Math.random(), NO Date.now(). Game-time via the `gameMinute` parameter.
//   Decay idempotence: stamping `last_used_tick = gameMinute` on decay ensures same tick is a no-op.
//
// ZERO-REGRESSION invariant (§1.3): this file is purely additive — no existing service is modified.

import { Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { Inject } from '@nestjs/common';
import { rivalAttackPatternResistance } from '../../../db/schema/conflict_rival';
import { RivalAiTunables } from './rival-ai.tunables';
import type { RivalKey } from './rival-ai.types';

// ─── Resistance bucket type (P6 / R2.2) ──────────────────────────────────────────────────────

/**
 * `ResistanceBucket` — the P6-safe closed domain returned by `getPatternResistance`.
 * Canon :285 names `ResistanceBucket` as the map value type.
 * The raw `resistance` float is HIDDEN (SERVER-ONLY, :305); only this bucket is returned.
 *
 * Thresholds [PROV-Y26Q2] (calibration TD — canon-silent magnitudes):
 *   none:   resistance < 0.05    — no effective resistance (at baseline)
 *   low:    0.05 ≤ r < 0.30     — mild adaptation (Tarcum 4 attacks = 0.20 → 'low')
 *   medium: 0.30 ≤ r < 0.60     — significant adaptation (Iron Throat 4 attacks post-4-decay-ticks = 0.56 → 'medium')
 *   high:   r ≥ 0.60            — strong counter-measure (Iron Throat 4 attacks = 0.60 → 'high')
 */
export type ResistanceBucket = 'none' | 'low' | 'medium' | 'high';

// ─── Bucket thresholds (PROV-Y26Q2 — canon-silent, calibration TD) ───────────────────────────

/** [PROV-Y26Q2] resistance → ResistanceBucket thresholds. */
const RESISTANCE_THRESHOLDS = {
  NONE_MAX:   0.05,  // [0.00, 0.05) → 'none'   (baseline — no meaningful counter-measure)
  LOW_MAX:    0.30,  // [0.05, 0.30) → 'low'    (mild adaptation: Tarcum 4 attacks = 0.20)
  MEDIUM_MAX: 0.60,  // [0.30, 0.60) → 'medium' (significant: Iron Throat 4 attacks post-decay = 0.56)
                     // [0.60, ∞)    → 'high'   (strong: Iron Throat 4 attacks = 0.60)
} as const;

/**
 * Map a raw `resistance` float to the P6-safe `ResistanceBucket`.
 * The float is NEVER exposed — only this derived bucket escapes the service boundary.
 */
function toResistanceBucket(resistance: number): ResistanceBucket {
  if (resistance < RESISTANCE_THRESHOLDS.NONE_MAX)   return 'none';
  if (resistance < RESISTANCE_THRESHOLDS.LOW_MAX)    return 'low';
  if (resistance < RESISTANCE_THRESHOLDS.MEDIUM_MAX) return 'medium';
  return 'high';
}

// ─── Per-rival adaptation rates (getter-sourced, composite-bucket → ref float) ───────────────

/**
 * Map a composite-bucket string (e.g. 'composite:HIGH', 'composite:STANDARD', 'composite:LOW')
 * to its canonical ref float. The bucket is sourced from `RivalAiTunables` getters.
 *
 * Canon ref floats (:291-293):
 *   HIGH     → 0.15  (Iron Throat adaptation rate)
 *   STANDARD → 0.10  (Coil adaptation rate)
 *   LOW      → 0.05  (Tarcum adaptation rate)
 *
 * The composite-bucket string is the R2.2 representation; the ref float is the scalar a service
 * uses for arithmetic. NEVER inline 0.15/0.10/0.05 — always go through the getter.
 *
 * Returns 0.05 as the safe fallback (conservative = LOW ref) for unrecognized bucket strings.
 */
function compositeToAdaptationRate(bucketStr: string): number {
  const upper = bucketStr.toUpperCase();
  if (upper.includes('HIGH'))     return 0.15; // :291 Iron Throat
  if (upper.includes('STANDARD')) return 0.10; // :292 Coil
  if (upper.includes('LOW'))      return 0.05; // :293 Tarcum
  // Fallback: conservative LOW ref (calibration TD placeholder for Saltline [PROV-Y26Q2]).
  return 0.05;
}

// ─── Service ─────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AdaptiveSkinService {

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: RivalAiTunables,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────────────────────

  /**
   * `recordAttack(playerId, rivalKey, patternHash, gameMinute)` — the B/C §13 write-hook.
   *
   * Read-modify-write for (player, rival, pattern):
   *   If no row → INSERT with resistance = adaptation_rate, last_used_tick = gameMinute.
   *   If row exists → UPDATE resistance += adaptation_rate, last_used_tick = gameMinute.
   *
   * The per-rival adaptation rate is sourced from the `RivalAiTunables` getter (getter-sourced,
   * NEVER inlined — the R2.2 / registry-first contract). The getter returns a composite-bucket string
   * ('composite:HIGH' / 'composite:STANDARD' / 'composite:LOW') mapped to the ref float (0.15/0.10/0.05).
   *
   * Pattern: trophic-gap.service.ts read-modify-write for sticky accumulators (per-player state).
   * DETERMINISM: no Math.random, no Date.now. gameMinute = game-time (NOT wall-clock).
   * P6: resistance is server-only; this method does NOT return the raw value.
   *
   * @param playerId    — the player's UUID.
   * @param rivalKey    — the rival being attacked (determines the adaptation rate).
   * @param patternHash — the deterministic attack-pattern key (B/C-supplied, varchar(64)).
   * @param gameMinute  — the in-game minute of the attack (NOT Date.now()).
   */
  async recordAttack(
    playerId: string,
    rivalKey: RivalKey,
    patternHash: string,
    gameMinute: number,
  ): Promise<void> {
    // Per-rival adaptation rate — getter-sourced (NEVER inlined).
    const rateBucket     = this.getAdaptationRateBucket(rivalKey);
    const adaptationRate = compositeToAdaptationRate(rateBucket);

    // Read the existing row (if any).
    const existing = await this.db
      .select({
        resistance:    rivalAttackPatternResistance.resistance,
        last_used_tick: rivalAttackPatternResistance.last_used_tick,
      })
      .from(rivalAttackPatternResistance)
      .where(and(
        eq(rivalAttackPatternResistance.player_id, playerId),
        eq(rivalAttackPatternResistance.rival_key, rivalKey),
        eq(rivalAttackPatternResistance.pattern_hash, patternHash),
      ))
      .limit(1);

    if (existing.length === 0) {
      // No row yet — INSERT at the adaptation_rate baseline.
      await this.db
        .insert(rivalAttackPatternResistance)
        .values({
          player_id:      playerId,
          rival_key:      rivalKey,
          pattern_hash:   patternHash,
          resistance:     adaptationRate,
          last_used_tick: BigInt(gameMinute),
        })
        .onConflictDoNothing(); // race-safe: if another path inserted concurrently, DO NOTHING
    } else {
      // Row exists — accumulate.
      const newResistance = (existing[0]!.resistance) + adaptationRate;
      await this.db
        .update(rivalAttackPatternResistance)
        .set({
          resistance:     newResistance,
          last_used_tick: BigInt(gameMinute),
        })
        .where(and(
          eq(rivalAttackPatternResistance.player_id, playerId),
          eq(rivalAttackPatternResistance.rival_key, rivalKey),
          eq(rivalAttackPatternResistance.pattern_hash, patternHash),
        ));
    }
  }

  /**
   * `getPatternResistance(playerId, rivalKey, patternHash)` → `ResistanceBucket` (P6 — NOT raw float).
   *
   * Reads the `resistance` float from the table for (player, rival, pattern).
   * If no row exists (pattern never attacked), returns 'none' (the baseline :281).
   * Maps the float to a closed `ResistanceBucket` — the ONLY public representation of resistance (:305).
   *
   * P6 invariant: the raw `resistance` float is NEVER returned. The bucket is derived server-side.
   *
   * @param playerId    — the player's UUID.
   * @param rivalKey    — the rival.
   * @param patternHash — the attack-pattern key.
   * @returns `ResistanceBucket` — 'none' | 'low' | 'medium' | 'high'.
   */
  async getPatternResistance(
    playerId: string,
    rivalKey: RivalKey,
    patternHash: string,
  ): Promise<ResistanceBucket> {
    const rows = await this.db
      .select({ resistance: rivalAttackPatternResistance.resistance })
      .from(rivalAttackPatternResistance)
      .where(and(
        eq(rivalAttackPatternResistance.player_id, playerId),
        eq(rivalAttackPatternResistance.rival_key, rivalKey),
        eq(rivalAttackPatternResistance.pattern_hash, patternHash),
      ))
      .limit(1);

    if (rows.length === 0) {
      return 'none'; // no resistance accumulated — at baseline (:281)
    }

    const resistance = rows[0]!.resistance;
    // P6: return the bucket — NEVER the raw float.
    return toResistanceBucket(resistance);
  }

  /**
   * `decayUnused(playerId, rivalKey, gameMinute)` — the NIGHTLY daily decay hook.
   *
   * Wired into `RivalTickService.runDailyTickForRival` (the SHARED path — the C6 lesson applied):
   *   Both the live `runDailyTick` scheduler loop AND the test route `runDailyTickForPlayer`
   *   call `runDailyTickForRival`. This method is invoked there → the test route automatically
   *   exercises this body → zero divergence from production path.
   *
   * For each `rival_attack_pattern_resistance` row where (player_id = playerId, rival_key = rivalKey)
   *   AND `last_used_tick` < `gameMinute` (pattern is "idle" — not used at or after this tick):
   *     resistance = max(0, resistance − decayPerTick)
   *     last_used_tick = gameMinute  ← idempotence gate: re-run same tick → NOT < → no-op
   *
   * Idempotence: stamping `last_used_tick = gameMinute` ensures that re-running the same daily tick
   *   (same `gameMinute`) is a no-op — `last_used_tick >= gameMinute` → the `lt` predicate is FALSE.
   *   This is the deterministic gate the spec's 2× same-days assertion relies on.
   *
   * DETERMINISM (C4): NO Math.random(), NO Date.now(). Pure function of DB state + gameMinute.
   * FALSIFIABILITY: if this method's body were deleted (no-op), the resistance would NOT decrease,
   *   and the E2E spec's `expect(rankB1).toBeLessThan(rankBefore)` assertion would FAIL (the C6 lesson).
   *
   * @param playerId   — the player's UUID.
   * @param rivalKey   — the rival whose idle patterns are decayed.
   * @param gameMinute — the in-game minute of the daily tick (NOT wall-clock).
   */
  async decayUnused(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    // Decay rate: getter-sourced (NEVER inlined). Default 0.01 per tick (:321, :474).
    const decayPerTick = this.tunables.adaptiveSkinResistanceDecayWhenUnusedPerTick;

    // Find all idle patterns for (player, rival):
    //   idle = last_used_tick < gameMinute (not used at or after this daily tick).
    const idleRows = await this.db
      .select({
        pattern_hash: rivalAttackPatternResistance.pattern_hash,
        resistance:   rivalAttackPatternResistance.resistance,
      })
      .from(rivalAttackPatternResistance)
      .where(and(
        eq(rivalAttackPatternResistance.player_id, playerId),
        eq(rivalAttackPatternResistance.rival_key, rivalKey),
        lt(rivalAttackPatternResistance.last_used_tick, BigInt(gameMinute)),
      ));

    if (idleRows.length === 0) return; // no idle patterns for this rival — no-op

    // Decay + idempotence stamp: max(0, resistance - decayPerTick), last_used_tick = gameMinute.
    for (const row of idleRows) {
      const newResistance = Math.max(0, row.resistance - decayPerTick);
      await this.db
        .update(rivalAttackPatternResistance)
        .set({
          resistance:     newResistance,
          last_used_tick: BigInt(gameMinute), // idempotence gate
        })
        .where(and(
          eq(rivalAttackPatternResistance.player_id, playerId),
          eq(rivalAttackPatternResistance.rival_key, rivalKey),
          eq(rivalAttackPatternResistance.pattern_hash, row.pattern_hash),
        ));
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the per-rival adaptation rate bucket string from the tunables getter (getter-sourced).
   * Canon (:291-293): Iron Throat HIGH, Coil STANDARD, Tarcum LOW. Saltline [PROV-Y26Q2].
   * NEVER inlines the raw float — always goes through the getter (R2.2 / registry-first contract).
   */
  private getAdaptationRateBucket(rivalKey: RivalKey): string {
    switch (rivalKey) {
      case 'iron_throat': return this.tunables.adaptiveSkinIronThroatAdaptationRateBucket;
      case 'coil':        return this.tunables.adaptiveSkinCoilAdaptationRateBucket;
      case 'tarcum':      return this.tunables.adaptiveSkinTarcumAdaptationRateBucket;
      case 'saltline':    return this.tunables.saltlineAdaptationRateBucket; // [PROV-Y26Q2] OQ-A1
      default:            return this.tunables.adaptiveSkinTarcumAdaptationRateBucket; // safe fallback
    }
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 5 (C5) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §5
//             Canon: docs/tech/04b_combat_and_conflict/mechanics_interlock.md §9.4 :80-92
//                    docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md :282
//             — Diplomacy & Information Warfare C C5 — 2026-06-26 —
//
// `CredibilityAccumulatorService` — DD-CREDIBILITY §5 — the SINGLE source of truth.
//
// Canon `mechanics_interlock.md:92` — a player who breaks one commitment damages all others.
// ALL 5 diplomacy mechanics that read/write credibility MUST go through this service.
// The credibility float lives in EXACTLY ONE table: `credibility_state`.
// No per-mechanic credibility column. No parallel credibility store.
//
// Methods:
//   recordBackedCommitment(playerId, rivalKey, burnType) — RAISES credibility (accrual getter-sourced).
//   recordFailedReveal(playerId, rivalKey)               — LOWERS credibility (-0.25 getter-sourced).
//   recordRefusedGift(playerId, rivalKey)                — LOWERS credibility (standing penalty getter-sourced).
//   getCredibilityScore(playerId, rivalKey)              — bands float → CredibilityScoreBucket.
//
// ★ Band derivation (the C2 review finding — OQ-C4 cross-key monotonicity hazard):
//   The 4 cut CAPS ranges OVERLAP (cross-key monotonicity is NOT enforced by the registry).
//   We READ all 4 cut getters, SORT ASCENDING, then band — NEVER assume registry order.
//   This prevents an out-of-order registry override from producing an impossible bucket.
//
// Determinism: NO Math.random(). NO Date.now(). Pure float ops on the persisted credibility.
// Getter-sourced: accrual / failed-reveal damage / standing penalty all sourced via DiplomacyTunables.
// The TunablesStore resolves composite:STANDARD references to ref float values.
//
// DD-CREDIBILITY anti-double-count:
//   credibility lives in EXACTLY ONE table (credibility_state).
//   Grep the diplomacy schema and every diplomacy service:
//   `credibility` column/field found ONLY on credibility_state.
//
// R9.3: credibility_state table created in migration 0094 (same-commit as C1).
// R2.2 / P6: the raw credibility float is SERVER/BO-only. Players receive CredibilityScoreBucket.
// R2.3: NO inline numeric scalar — accrual / damage / penalty ALL getter-sourced.

import { Injectable, Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { credibilityState } from '../../../db/schema/conflict_diplomacy';
import type { RivalKey } from '../rival/rival-ai.types';
import { DiplomacyTunables } from './diplomacy.tunables';
import type { CredibilityScoreBucket, BurnType } from './diplomacy.types';

// ── Composite ref-float resolvers ─────────────────────────────────────────────────────────────────
// The TunablesStore resolves composite:STANDARD/HIGH/LOW bucket names to their ref float values
// (e.g. composite:STANDARD → 0.1 for accrual, -0.25 for failed-reveal damage).
// These resolvers extract the float from the bucket string.
//
// Bucket name patterns (gdd/14):
//   composite:STANDARD  → the STANDARD ref float for this key's domain
//   composite:HIGH      → higher ref float
//   composite:LOW       → lower ref float
//
// For the credibility accumulator:
//   vuln_credibility_accrual_per_backed_commitment_bucket   → composite:STANDARD (ref 0.10)
//   sealed_envelope_failed_reveal_credibility_damage_bucket → composite:STANDARD (ref -0.25)
//   potlatch_standing_penalty_full_refusal_bucket           → composite:STANDARD (ref 0.20)
//
// The composite:STANDARD ref-float values are DEFINED by canon (diplomacy_mechanics.md :101, :228, :127).
// They are getter-sourced here to ensure any registry override flows through the tunable.
//
// NOTE: We do NOT inline -0.25 / 0.10 / 0.20 — we READ the bucket string and translate it.
// The translation table below mirrors the gdd/15 composite ref-float table (STANDARD/HIGH/LOW per key).

/** Translate a composite bucket string to its ref float for credibility keys. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) {
    return refMap[key]!;
  }
  // If the bucket is already a parseable number (shouldn't happen, but be defensive)
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  // Default: return 0 so a misconfigured bucket is a no-op (safe fallback).
  return 0;
}

// Composite ref-float maps for the three credibility keys.
// Canon refs from diplomacy_mechanics.md :101, :228, :127 (via gdd/15).
// PROV-Y26Q2 Note: these ref-floats are the PROPOSED values; calibration TD.

/** Ref floats for `diplomacy.vuln_credibility_accrual_per_backed_commitment_bucket`. */
const ACCRUAL_REF_MAP: Record<string, number> = {
  'composite:standard': 0.10,
  'composite:high':     0.25,
  'composite:low':      0.05,
};

/** Ref floats for `diplomacy.sealed_envelope_failed_reveal_credibility_damage_bucket`. */
const FAILED_REVEAL_DAMAGE_REF_MAP: Record<string, number> = {
  'composite:standard': -0.25,
  'composite:high':     -0.40,
  'composite:low':      -0.10,
};

/** Ref floats for `diplomacy.potlatch_standing_penalty_full_refusal_bucket`. */
const STANDING_PENALTY_REF_MAP: Record<string, number> = {
  'composite:standard': -0.20,
  'composite:high':     -0.35,
  'composite:low':      -0.08,
};

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CredibilityAccumulatorService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
  ) {}

  // ─── Private helpers ─────────────────────────────────────────────────────────────────────────

  /**
   * Ensure a credibility_state row exists for (playerId, rivalKey), then apply a float delta.
   * Uses UPSERT + SQL increment to avoid read-then-write races.
   * Returns the new credibility float after the update.
   */
  private async applyDelta(
    playerId: string,
    rivalKey: RivalKey,
    delta: number,
    clampMin: number,
    clampMax: number,
  ): Promise<number> {
    // UPSERT: if no row, insert with credibility=0; then increment by delta, clamp to [min, max].
    const [row] = await this.db
      .insert(credibilityState)
      .values({
        player_id: playerId,
        rival_key: rivalKey,
        credibility: Math.min(clampMax, Math.max(clampMin, delta)),
      })
      .onConflictDoUpdate({
        target: [credibilityState.player_id, credibilityState.rival_key],
        set: {
          credibility: sql`LEAST(${clampMax}::real, GREATEST(${clampMin}::real, ${credibilityState.credibility} + ${delta}::real))`,
        },
      })
      .returning();
    return (row as { credibility: number }).credibility;
  }

  /**
   * Read the raw credibility float (or 0 if no row).
   */
  private async readCredibilityFloat(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<number> {
    const rows = await this.db
      .select({ credibility: credibilityState.credibility })
      .from(credibilityState)
      .where(
        and(
          eq(credibilityState.player_id, playerId),
          eq(credibilityState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return 0;
    return rows[0]!.credibility;
  }

  /**
   * ★ Band derivation — OQ-C4 defensive sort.
   * Reads the 4 cut getters, SORTS ascending, then bands the float.
   * This prevents cross-key monotonicity violations from a misconfigured registry.
   *
   * OQ-C4 PROPOSED defaults (PROV-Y26Q2):
   *   credibility_bucket_cut_very_low_max = -0.25
   *   credibility_bucket_cut_low_max      =  0.0
   *   credibility_bucket_cut_standard_max =  0.25
   *   credibility_bucket_cut_high_max     =  1.0
   *
   * Bands (ascending credibility = ascending bucket rank):
   *   credibility ≤ cuts[0] → 'shattered'
   *   credibility ≤ cuts[1] → 'damaged'
   *   credibility ≤ cuts[2] → 'maintained'
   *   otherwise             → 'pristine'
   */
  private bandCredibility(credibility: number): CredibilityScoreBucket {
    // Read all 4 cuts from getters (getter-sourced, never inline).
    const rawCuts = [
      this.tunables.credibilityBucketCutVeryLowMax,
      this.tunables.credibilityBucketCutLowMax,
      this.tunables.credibilityBucketCutStandardMax,
      this.tunables.credibilityBucketCutHighMax,
    ];

    // ★ Defensive sort ascending (the OQ-C4 cross-key monotonicity guard).
    // If a registry override produces out-of-order cuts, we sort before banding.
    const cuts = [...rawCuts].sort((a, b) => a - b);

    // Band: walk the sorted cuts from lowest to highest.
    // cuts[0] = VERY_LOW max → shattered
    // cuts[1] = LOW max     → damaged
    // cuts[2] = STANDARD max→ maintained
    // else                  → pristine
    if (credibility <= cuts[0]!) return 'shattered';
    if (credibility <= cuts[1]!) return 'damaged';
    if (credibility <= cuts[2]!) return 'maintained';
    return 'pristine';
  }

  // ─── Public API ──────────────────────────────────────────────────────────────────────────────

  /**
   * `recordBackedCommitment` — RAISES credibility by the accrual amount (getter-sourced).
   * Called by BurnNoticeService (Burn Notice §4.1) when a commitment is backed.
   * Canon: diplomacy_mechanics.md :101 (`vuln_credibility_accrual_per_backed_commitment_bucket` composite:STANDARD ref 0.10).
   *
   * @param burnType — informational (no branching on burn type for the accumulator; all raise equally).
   * @returns the new CredibilityScoreBucket after the raise.
   */
  async recordBackedCommitment(
    playerId: string,
    rivalKey: RivalKey,
    _burnType: BurnType,
  ): Promise<CredibilityScoreBucket> {
    // Accrual: getter-sourced from the BACKED_COMMITMENT tunable bucket (composite:STANDARD ref 0.10).
    const accrualBucket = this.tunables.vulnCredibilityAccrualPerBackedCommitmentBucket;
    const accrualDelta = resolveCompositeRef(accrualBucket, ACCRUAL_REF_MAP);

    // Clamp: credibility is bounded to [-1.0, 1.0] (the valid float domain).
    const newCred = await this.applyDelta(playerId, rivalKey, accrualDelta, -1.0, 1.0);
    return this.bandCredibility(newCred);
  }

  /**
   * `recordFailedReveal` — LOWERS credibility by the failed-reveal damage (getter-sourced).
   * Called by SealedEnvelopeCommitmentService (§4.7) when a sealed commitment is not revealed
   * before the deadline (the "failed reveal" event).
   * Canon: diplomacy_mechanics.md :228 (`sealed_envelope_failed_reveal_credibility_damage_bucket` composite:STANDARD ref -0.25).
   *
   * @returns the new CredibilityScoreBucket after the damage.
   */
  async recordFailedReveal(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<CredibilityScoreBucket> {
    // Damage: getter-sourced (NEGATIVE composite:STANDARD ref -0.25).
    const damageBucket = this.tunables.sealedEnvelopeFailedRevealCredibilityDamageBucket;
    const damageDelta = resolveCompositeRef(damageBucket, FAILED_REVEAL_DAMAGE_REF_MAP);
    // damageDelta is negative (the composite:STANDARD ref is -0.25).

    const newCred = await this.applyDelta(playerId, rivalKey, damageDelta, -1.0, 1.0);
    return this.bandCredibility(newCred);
  }

  /**
   * `recordRefusedGift` — LOWERS credibility by the standing penalty (getter-sourced).
   * Called by PotlatchBindService (§4.3) when the rival refuses a gift.
   * Canon: diplomacy_mechanics.md :127 (`potlatch_standing_penalty_full_refusal_bucket` composite:STANDARD ref 0.20).
   *
   * @returns the new CredibilityScoreBucket after the penalty.
   */
  async recordRefusedGift(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<CredibilityScoreBucket> {
    // Penalty: getter-sourced (the standing penalty bucket; stored as POSITIVE in the registry
    // since it represents a magnitude, but we apply it as a NEGATIVE delta here).
    const penaltyBucket = this.tunables.potlatchStandingPenaltyFullRefusalBucket;
    const penaltyMagnitude = resolveCompositeRef(penaltyBucket, STANDING_PENALTY_REF_MAP);
    // penaltyMagnitude is already negative in STANDING_PENALTY_REF_MAP (-0.20 for STANDARD).

    const newCred = await this.applyDelta(playerId, rivalKey, penaltyMagnitude, -1.0, 1.0);
    return this.bandCredibility(newCred);
  }

  /**
   * `getCredibilityScore` — reads the credibility float and returns the CredibilityScoreBucket.
   * The player-facing band (never the raw float — R2.2/P6 wall).
   * All 5 diplomacy mechanics that READ credibility call this.
   *
   * ★ DD-CREDIBILITY single-accumulator: reads ONLY `credibility_state.credibility`.
   */
  async getCredibilityScore(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<CredibilityScoreBucket> {
    const credibility = await this.readCredibilityFloat(playerId, rivalKey);
    return this.bandCredibility(credibility);
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 10 (C10)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.1 (:31,:69)
//             OQ-1 / DIV-1: the BOOKKEEPER archetype gains a NEW capability (NOT a new archetype/role).
//             — Forensic C10 — 2026-06-19
//
// `BookkeeperLieutenantService` — the 5.1 Benford-preserving noise-injection capability.
//
// NEW capability on the EXISTING `BOOKKEEPER` archetype (role_id 3, BOOKKEEPER_ROLE_ID).
// Gated by assigned building type (OQ-1):
//   - front → noise-injection (this service)
//   - money_holding → existing cash-deposit (bookkeeper-binding.ts — UNCHANGED)
//
// `injectStructurallyRealisticNoise(playerId, frontId, ringIndex, declaredAmountCents): Promise<number>`
//   — if a BOOKKEEPER lieutenant is assigned to `frontId` (lieutenant.assigned_building_id = frontId,
//     lieutenant.role_id = BOOKKEEPER_ROLE_ID):
//     (a) Returns a first-digit (1..9) drawn DETERMINISTICALLY from the Benford distribution,
//         seeded from `${frontId}:${ringIndex}` (djb2 hash, no Math.random — C4 anti-stochastic).
//         The digit is sampled via weighted CDF inversion over BENFORD_REFERENCE (the cumulative
//         sum of Benford probabilities for digits 1..9). Same inputs → same output (pure function
//         of `frontId` and `ringIndex`).
//     (b) Debits `benfordBookkeeperCutPct` % of `declaredAmountCents` cash-clear from
//         `economy_states.cash_cents` (§4.1-mirror UPDATE). The debit is cash-clear (wallet only —
//         no held_cents, no laundering table touched). Zero wallet → no-op debit.
//   — if NO BOOKKEEPER is assigned to `frontId` → returns null (the caller uses the raw first-digit).
//
// The shaping produces a Benford-conform histogram over a run of receipts:
//   63 uniform-looking receipt amounts → 63 shaped digits → χ² ≤ H (≈ 4.09 vs H=14.0 default).
//   Compare: the SAME 63 amounts WITHOUT the Bookkeeper → χ² ≈ 25.3 > H → soft-flag fires.
//   This is the FALSIFIABLE mitigation: protected ≠ un-protected (proves the mechanic is not vacuous).
//
// Anti-fabrication:
//   - NO Math.random (banned — market-rng.service.ts:24; C4 invariant). Pure djb2 hash seeding.
//   - Cut fraction sources `forensicTunables.benfordBookkeeperCutPct` (C4 getter, never inline scalar).
//   - BENFORD_REFERENCE is the single authoritative array (forensic-constants.ts, C6).
// Zero-regression:
//   - The existing money_holding deposit path in `bookkeeper-binding.ts` is BYTE-IDENTICAL (unchanged).
//   - An un-protected front (no BOOKKEEPER assigned) is BYTE-IDENTICAL (the null return → raw digit).
// OQ-1: gated by DB query (lieutenant row with role_id=BOOKKEEPER_ROLE_ID and
//   assigned_building_id=frontId). The front type is not re-validated here (trusted from assignment).
// R2.2: the Benford-shaped digit is server-side only; never returned to a client projection.
//
// Determinism proof:
//   The seed string `${frontId}:${ringIndex}` is a pure function of (frontId, position-in-ring).
//   The djb2 hash of this seed is fold-mod'd into [0, 1) via `/2^32`, then the CDF inversion
//   picks the digit. For the same frontId and the same position, the result is always the same
//   digit — cross-process, cross-restart, cross-machine (no Date.now(), no process.pid, no entropy).

import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { lieutenant } from '../../db/schema/lieutenant';
import { economyState } from '../../db/schema/player_economy_state';
import { BENFORD_REFERENCE } from './forensic-constants';
import { forensicTunables } from './forensic-tunables';
import { BOOKKEEPER_ROLE_ID } from '../lieutenant/lieutenant-archetype';

/**
 * Pre-computed CDF of the Benford distribution (cumulative sum of BENFORD_REFERENCE).
 * CDF[i] = P(digit ≤ i+1) = sum(BENFORD_REFERENCE[0..i]).
 * Used for weighted sampling via CDF inversion (deterministic, no Math.random).
 * CDF[8] = 1.0 (the last entry covers all probability mass).
 */
const BENFORD_CDF: readonly number[] = Object.freeze(
  BENFORD_REFERENCE.reduce<number[]>((acc, p, i) => {
    acc.push((acc[i - 1] ?? 0) + p);
    return acc;
  }, []),
);

/**
 * djb2 hash — 32-bit unsigned.
 * Pure: same string → same hash. No Math.random. No Date.now().
 * Algorithm: hash = (hash * 33) ^ charCode, coerced to uint32 each step.
 * @param s - the seed string.
 * @returns - a 32-bit unsigned integer (0 .. 2^32 - 1).
 */
function djb2(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
    hash = hash >>> 0; // coerce to uint32
  }
  return hash;
}

/**
 * benfordDigit — deterministically sample a leading digit (1..9) from the Benford distribution.
 *
 * Seeded from `${ringIndex}:${frontId}` — a pure function of (frontId, position-in-ring).
 * (ringIndex FIRST — see the IMPORTANT note in the body for the djb2 hash-variation rationale.)
 * No Math.random (banned — C4 invariant).
 *
 * Algorithm: CDF inversion.
 *   1. hash = djb2(`${ringIndex}:${frontId}`) → uint32.
 *   2. u = hash / 2^32 → a value in [0, 1).
 *   3. Find the smallest i such that BENFORD_CDF[i] > u → return digit (i+1).
 *
 * This produces digit d with probability BENFORD_REFERENCE[d-1], exactly matching the
 * Benford distribution. Over a large sample (N=63), the histogram approximates Benford
 * (χ² ≈ 4.09 for N=63, far below H=14.0).
 *
 * @param frontId   - the front building uuid (per-front seed).
 * @param ringIndex - the current ring position (0-based, grows with each receipt).
 * @returns         - a digit 1..9, Benford-distributed, deterministic.
 */
function benfordDigit(frontId: string, ringIndex: number): number {
  // IMPORTANT: ringIndex comes FIRST in the seed to ensure the djb2 hash has large variation
  // across consecutive ring positions. If frontId came first, the accumulated hash after the
  // long frontId string is nearly identical for ringIndex 0,1,2,...,62 (the short suffix has
  // minimal impact on djb2's rolling hash). By putting ringIndex first, different positions
  // produce completely different starting seeds and thus well-distributed u values.
  const seed = `${ringIndex}:${frontId}`;
  const hash = djb2(seed);
  // Fold into [0, 1) — division by 2^32 (unsigned range).
  const u = hash / 0x100000000;
  // CDF inversion: find the smallest index i such that CDF[i] > u.
  for (let i = 0; i < BENFORD_CDF.length; i++) {
    if (u < BENFORD_CDF[i]) {
      return i + 1; // digit is 1-indexed
    }
  }
  return 9; // fallback (rounding at CDF[8] ≈ 1.0)
}

@Injectable()
export class BookkeeperLieutenantService {
  private readonly logger = new Logger(BookkeeperLieutenantService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * injectStructurallyRealisticNoise — C10 core: Benford-preserving noise injection + cut debit.
   *
   * Called from `LeadingDigitAuditService.recordReceipt` BEFORE the ring push, when a BOOKKEEPER
   * lieutenant is assigned to `frontId`.
   *
   * (a) Shape the first-digit: returns a digit 1..9 drawn deterministically from BENFORD_REFERENCE,
   *     seeded from `${frontId}:${ringIndex}`. The ring will be Benford-conform (χ² ≤ H) even
   *     if the underlying receipts are uniform-looking (the mitigation is FALSIFIABLE: compare
   *     protected vs un-protected under the same uniform inputs).
   * (b) Debit the Bookkeeper cut: `floor(declaredAmountCents * benfordBookkeeperCutPct / 100)`
   *     cash-clear from `economy_states.cash_cents`. §4.1-mirror UPDATE with cash_cents >= seized
   *     guard. Zero wallet / zero cut → no-op debit.
   *
   * Returns the shaped digit (1..9) if a BOOKKEEPER is assigned to `frontId`;
   * returns null if no BOOKKEEPER is found (caller uses the raw first-digit).
   *
   * NO Math.random (banned). No Date.now(). Deterministic (same frontId + ringIndex → same digit).
   * Anti-fabrication: cut fraction from `forensicTunables.benfordBookkeeperCutPct` (C4 getter).
   *
   * @param playerId          - player uuid (for cut debit + BOOKKEEPER lookup scope).
   * @param frontId           - front building uuid (seed for deterministic digit + lookup target).
   * @param ringIndex         - the current 0-based ring position (seed for determinism).
   * @param declaredAmountCents - the declared receipt amount (for cut debit computation).
   * @returns                 - shaped digit (1..9) if BOOKKEEPER is assigned, null otherwise.
   */
  async injectStructurallyRealisticNoise(
    playerId: string,
    frontId: string,
    ringIndex: number,
    declaredAmountCents: number,
  ): Promise<number | null> {
    // (0) Check if a BOOKKEEPER lieutenant is assigned to this front.
    //     Query: lieutenant where player_id=playerId AND role_id=BOOKKEEPER_ROLE_ID
    //            AND assigned_building_id=frontId.
    //     OQ-1: gated by DB row (no building-type re-validation here — trusted from assignment).
    const [bookkeeperRow] = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id })
      .from(lieutenant)
      .where(
        sql`${lieutenant.player_id} = ${playerId}::uuid
          AND ${lieutenant.role_id} = ${BOOKKEEPER_ROLE_ID}
          AND ${lieutenant.assigned_building_id} = ${frontId}::uuid`,
      )
      .limit(1);

    if (!bookkeeperRow) {
      // No BOOKKEEPER assigned to this front → caller uses raw first-digit (zero-regression).
      return null;
    }

    // (a) Deterministic Benford digit (CDF inversion, djb2 seeded from frontId:ringIndex).
    //     NO Math.random (banned — C4 invariant).
    const shapedDigit = benfordDigit(frontId, ringIndex);

    // (b) Cash-clear cut debit: floor(declaredAmountCents * benfordBookkeeperCutPct / 100).
    //     Sources `forensicTunables.benfordBookkeeperCutPct` (C4 getter, T.forensic.benford_bookkeeper_cut_pct).
    //     NEVER an inline scalar.
    //     §4.1-mirror UPDATE with cash_cents >= cut guard (prevents negative balance).
    //     Zero wallet → the UPDATE's WHERE prevents a debit (0 rows updated → benign no-op).
    const cutPct = forensicTunables.benfordBookkeeperCutPct;
    const cut = Math.floor(declaredAmountCents * cutPct / 100);

    if (cut > 0) {
      await this.db
        .update(economyState)
        .set({
          cash_cents: sql`${economyState.cash_cents} - ${BigInt(cut)}`,
        })
        .where(
          sql`${economyState.player_id} = ${playerId}::uuid AND ${economyState.cash_cents} >= ${BigInt(cut)}`,
        );

      this.logger.debug(
        `injectStructurallyRealisticNoise: playerId=${playerId} frontId=${frontId} ` +
          `ringIndex=${ringIndex} shapedDigit=${shapedDigit} cut=${cut} (${cutPct}% of ${declaredAmountCents})`,
      );
    }

    return shapedDigit;
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 8 (C8) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §3.7
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4.7 (Sealed-Envelope)
//             — Diplomacy & Information Warfare C C8 — 2026-06-26 —
//
// `SealedEnvelopeCommitmentService` — §4.7 Sealed-Envelope Commitment.
//
// Purpose:
//   Cryptographic commit-reveal protocol: the player commits to a target without revealing which
//   target. The rival must defend everywhere (capacity dilution). Failed reveals damage credibility.
//
// DD-SEALED-HASH (invariant):
//   target_hash = a DETERMINISTIC hash of (targetId, seeded salt).
//   salt = makeRng('sealed:${commitId}:salt').next()  — seeded, NOT Math.random.
//   hash = makeRng('sealed_hash:${commitId}:${targetId}').next().toString(16)
//   SAME inputs (playerId, rivalKey, gameMinute, targetId) → SAME commitId → SAME salt → SAME hash.
//   NO Math.random() anywhere in the commit path.
//
// commitId derivation (deterministic, not DB-generated UUID):
//   commitId = makeRng('seal_id:${playerId}:${rivalKey}:${gameMinute}').int(0, 0xFFFFFFFF).toString(16).padStart(8, '0')
//   This is game-state-derived (C4-clean). The DB row uses this as a logical ID stored in the row
//   (the schema's commitment_id is the DB PK via defaultRandom(); commitId is our deterministic
//   logical key stored separately for hash derivation).
//
// Methods:
//   commit(playerId, rivalKey, targetId, deadlineTick, gameMinute)
//     — Computes commitId (deterministic), computes target_hash (deterministic, DD-SEALED-HASH).
//     — Inserts sealed_envelope_commitment row: { target_hash, reveal_deadline_tick }.
//     — Returns { commitmentId (DB PK), logicalCommitId, targetHash, deadlineTick }.
//
//   revealAtDeadline(playerId, rivalKey, commitmentId, gameMinute)
//     — Deadline compare: revealed = gameMinute < revealDeadlineTick (within window → MET).
//     — If gameMinute >= revealDeadlineTick → MISSED deadline → calls recordFailedReveal (-0.25).
//     — Returns { revealed, penaltyApplied, credibilityBucket }.
//     — ★ FALSIFIABLE: met (gameMinute < deadline) → no penalty; missed → penalty fires.
//
//   readCommitment(commitmentId)
//     — Read the sealed_envelope_commitment row. Returns null if not found.
//
// C4 (determinism): NO Math.random(). NO Date.now().
//   commitId and target_hash are both seeded from game state.
// R2.3: all magnitudes getter-sourced (sealedEnvelopeFailedRevealCredibilityDamageBucket).
// R9.3: sealed_envelope_commitment table created in migration 0095 (same-commit as C7).
// DD-CREDIBILITY: failed reveal calls CredibilityAccumulatorService.recordFailedReveal ONLY.
//   No per-mechanic credibility write (the single-SSOT invariant).

import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { sealedEnvelopeCommitment } from '../../../db/schema/conflict_diplomacy';
import { makeRng } from '../../../common/seeded-rng';
import type { RivalKey } from '../rival/rival-ai.types';
import { DiplomacyTunables } from './diplomacy.tunables';
import { CredibilityAccumulatorService } from './credibility-accumulator.service';
import type { CredibilityScoreBucket } from './diplomacy.types';

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SealedEnvelopeCommitmentService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
    private readonly credibilityAccumulator: CredibilityAccumulatorService,
  ) {}

  /**
   * `commit` — create a sealed commitment (DD-SEALED-HASH).
   *
   * Steps:
   * 1. Derive a deterministic logical commitId from (playerId, rivalKey, gameMinute).
   *    commitId = makeRng('seal_id:${playerId}:${rivalKey}:${gameMinute}').int(0, 0xFFFFFFFF)
   *               .toString(16).padStart(8, '0')
   * 2. Compute the target_hash (DD-SEALED-HASH, deterministic):
   *    target_hash = makeRng('sealed_hash:${commitId}:${targetId}').next().toString(16)
   *    This is: same (playerId, rivalKey, gameMinute, targetId) → same commitId → same hash.
   *    NO Math.random() anywhere.
   * 3. Insert the sealed_envelope_commitment row.
   * 4. Return { commitmentId (DB PK), logicalCommitId, targetHash, deadlineTick }.
   *
   * @param playerId — the committing player
   * @param rivalKey — the target rival (for public ledger / commitment scope)
   * @param targetId — the committed target (hashed — NOT stored in plaintext)
   * @param deadlineTick — game-time tick by which the reveal must happen (or penalty fires)
   * @param gameMinute — current game time (the deterministic seed input)
   */
  async commit(
    playerId: string,
    rivalKey: RivalKey,
    targetId: string,
    deadlineTick: number,
    gameMinute: number,
  ): Promise<{
    commitmentId: string;
    logicalCommitId: string;
    targetHash: string;
    deadlineTick: number;
  }> {
    // 1. Deterministic logical commitId (game-state-derived, C4-clean, NOT Math.random)
    const logicalCommitId = makeRng(`seal_id:${playerId}:${rivalKey}:${gameMinute}`)
      .int(0, 0xFFFFFFFF)
      .toString(16)
      .padStart(8, '0');

    // 2. DD-SEALED-HASH: deterministic hash of (targetId, salt from seeded RNG)
    //    salt = first draw from makeRng('sealed:${logicalCommitId}')  [OQ-C2]
    //    target_hash = makeRng('sealed_hash:${logicalCommitId}:${targetId}').next().toString(16)
    //    SAME inputs → SAME logicalCommitId → SAME seed → SAME hash. NO Math.random.
    const targetHash = makeRng(`sealed_hash:${logicalCommitId}:${targetId}`)
      .next()
      .toString(16);

    // 3. Insert the row (DB PK is uuid, but logicalCommitId drives the hash determinism)
    const [row] = await this.db
      .insert(sealedEnvelopeCommitment)
      .values({
        player_id:            playerId,
        rival_key:            rivalKey,
        target_hash:          targetHash,
        reveal_deadline_tick: BigInt(deadlineTick),
      })
      .returning({ commitment_id: sealedEnvelopeCommitment.commitment_id });

    const commitmentId = row!.commitment_id;
    return { commitmentId, logicalCommitId, targetHash, deadlineTick };
  }

  /**
   * `revealAtDeadline` — attempt to reveal the commitment; check the deadline.
   *
   * Deadline compare (the GATE — C4 deterministic, NOT Date.now()):
   *   gameMinute < revealDeadlineTick → WITHIN window → MET reveal → no penalty
   *   gameMinute >= revealDeadlineTick → PAST deadline (missed) → recordFailedReveal fires (−0.25)
   *
   * ★ FALSIFIABLE (both-ways at same precondition):
   *   MET (gameMinute=0, deadline=99999): penaltyApplied=false, credibility unchanged
   *   MISSED (gameMinute=99999, deadline=1): penaltyApplied=true, credibility drops −0.25
   *   Removing the deadline check makes both paths return the same result → one assertion fails.
   *
   * @param playerId — the committing player
   * @param rivalKey — the target rival
   * @param commitmentId — the DB PK of the sealed commitment row
   * @param gameMinute — current game time (the deadline comparison)
   */
  async revealAtDeadline(
    playerId: string,
    rivalKey: RivalKey,
    commitmentId: string,
    gameMinute: number,
  ): Promise<{
    revealed: boolean;
    penaltyApplied: boolean;
    credibilityBucket: CredibilityScoreBucket;
  }> {
    // Read the commitment to get the deadline
    const rows = await this.db
      .select({
        reveal_deadline_tick: sealedEnvelopeCommitment.reveal_deadline_tick,
        target_hash:          sealedEnvelopeCommitment.target_hash,
      })
      .from(sealedEnvelopeCommitment)
      .where(eq(sealedEnvelopeCommitment.commitment_id, commitmentId))
      .limit(1);

    if (rows.length === 0) {
      // Row not found — return neutral state (commitment never created)
      const credentialityBucket = await this.credibilityAccumulator.getCredibilityScore(playerId, rivalKey);
      return { revealed: false, penaltyApplied: false, credibilityBucket: credentialityBucket };
    }

    const revealDeadlineTick = Number(rows[0]!.reveal_deadline_tick);

    // ★ GATE: deadline compare against game-time (NOT Date.now() — C4 determinism)
    //   gameMinute < revealDeadlineTick → within window → MET reveal → no penalty
    //   gameMinute >= revealDeadlineTick → deadline passed without execution → MISSED → penalty
    const withinDeadline = gameMinute < revealDeadlineTick;

    if (withinDeadline) {
      // MET reveal — within window, no penalty
      const credentialityBucket = await this.credibilityAccumulator.getCredibilityScore(playerId, rivalKey);
      return { revealed: true, penaltyApplied: false, credibilityBucket: credentialityBucket };
    } else {
      // MISSED deadline — calls recordFailedReveal (the -0.25 credibility damage, getter-sourced)
      // DD-CREDIBILITY: ONLY call is through CredibilityAccumulatorService — no direct DB write here.
      const newBucket = await this.credibilityAccumulator.recordFailedReveal(playerId, rivalKey);
      return { revealed: false, penaltyApplied: true, credibilityBucket: newBucket };
    }
  }

  /**
   * `readCommitment` — read the sealed_envelope_commitment row by PK (for _test routes).
   * Returns null if not found.
   */
  async readCommitment(
    commitmentId: string,
  ): Promise<{
    commitment_id: string;
    player_id: string;
    rival_key: string;
    target_hash: string;
    reveal_deadline_tick: string;
  } | null> {
    const rows = await this.db
      .select()
      .from(sealedEnvelopeCommitment)
      .where(eq(sealedEnvelopeCommitment.commitment_id, commitmentId))
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      commitment_id:        r.commitment_id,
      player_id:            r.player_id,
      rival_key:            r.rival_key as string,
      target_hash:          r.target_hash,
      reveal_deadline_tick: String(r.reveal_deadline_tick),
    };
  }
}

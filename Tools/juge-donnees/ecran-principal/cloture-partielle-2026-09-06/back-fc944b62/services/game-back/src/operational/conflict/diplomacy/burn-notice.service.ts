// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 6 (C6) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §3.1
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4.1 (Burn Notice)
//             — Diplomacy & Information Warfare C C6 — 2026-06-26 —
//
// `BurnNoticeService` — §4.1 Burn Notice — backed commitment signal.
//
// Purpose:
//   A burn notice is the player publicly committing to a costly, credible action
//   (a "burned option"): the player irrevocably signals that a resource/route/intermediary
//   will be destroyed if the rival defects.  The CREDIBILITY of this commitment comes from
//   writing it to the `commitment_ledger` jsonb array + calling
//   `credibilityAccumulator.recordBackedCommitment` (which RAISES the credibility band).
//
// Methods:
//   commitBurn(playerId, rivalKey, burnType, targetId, gameMinute)
//     — Appends a BurnedOptionEntry to the `commitment_ledger` jsonb on diplomacy_pair_state.
//     — Calls credibilityAccumulator.recordBackedCommitment → raises the credibility band.
//     — Returns { commitmentId, credibilityBucket }.
//
//   getCommitmentLedger(playerId, rivalKey)
//     — Reads the commitment_ledger jsonb array ([] if no row).
//     — Returns the raw jsonb array.
//
// DD-CREDIBILITY:
//   This service WRITES credibility via CredibilityAccumulatorService ONLY.
//   No per-mechanic credibility column (DD-CREDIBILITY anti-double-count).
//
// C4 (determinism): NO Math.random(). NO Date.now().
//   commitment_id is derived from makeRng(`burn_id:${playerId}:${rivalKey}:${burnType}:${ledgerLength}`)
//   — deterministic from game state, not wall-clock.
//
// R2.3: No inline numeric scalars. All magnitudes come via DiplomacyTunables getters.
// R9.3: commitment_ledger lives on diplomacy_pair_state (migration 0094, same-commit as C1).

import { Injectable, Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { diplomacyPairState } from '../../../db/schema/conflict_diplomacy';
import { makeRng } from '../../../common/seeded-rng';
import type { RivalKey } from '../rival/rival-ai.types';
import { DiplomacyTunables } from './diplomacy.tunables';
import { CredibilityAccumulatorService } from './credibility-accumulator.service';
import type { BurnType, CredibilityScoreBucket } from './diplomacy.types';

// ── BurnedOptionEntry shape (appended to the commitment_ledger jsonb array) ───────────────────────

interface BurnedOptionEntry {
  /** Deterministic ID: makeRng(`burn_id:${playerId}:${rivalKey}:${burnType}:${ledgerLength}`).int() */
  commitment_id: string;
  burn_type: BurnType;
  target_id: string;
  /** Game minute of the commitment (NOT wall-clock — deterministic). */
  committed_at_game_minute: number;
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class BurnNoticeService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
    private readonly credibilityAccumulator: CredibilityAccumulatorService,
  ) {}

  /**
   * `commitBurn` — append a BurnedOptionEntry to the commitment_ledger + RAISE credibility.
   *
   * Steps:
   * 1. Read current commitment_ledger from diplomacy_pair_state ([] if no row).
   * 2. Generate a deterministic commitment_id via makeRng (NO Math.random()).
   * 3. Append the new BurnedOptionEntry.
   * 4. Upsert diplomacy_pair_state with the new ledger (onConflictDoUpdate).
   * 5. Call credibilityAccumulator.recordBackedCommitment → RAISES the credibility band.
   * 6. Return { commitmentId, credibilityBucket }.
   *
   * C4: commitment_id = makeRng(`burn_id:${playerId}:${rivalKey}:${burnType}:${ledgerLength}`)
   *      .int(100000000, 999999999).toString()
   * DD-CREDIBILITY: credibility written ONLY via the accumulator (no inline column).
   */
  async commitBurn(
    playerId: string,
    rivalKey: RivalKey,
    burnType: BurnType,
    targetId: string,
    gameMinute: number,
  ): Promise<{ commitmentId: string; credibilityBucket: CredibilityScoreBucket }> {
    // 1. Read current ledger (or empty array if no row).
    const existingLedger = await this._readLedger(playerId, rivalKey);

    // 2. Generate deterministic commitment_id (C4 — NO Math.random()).
    const commitmentId = makeRng(
      `burn_id:${playerId}:${rivalKey}:${burnType}:${existingLedger.length}`,
    ).int(100000000, 999999999).toString();

    // 3. Append the new entry.
    const newEntry: BurnedOptionEntry = {
      commitment_id: commitmentId,
      burn_type: burnType,
      target_id: targetId,
      committed_at_game_minute: gameMinute,
    };
    const newLedger = [...existingLedger, newEntry];

    // 4. Upsert diplomacy_pair_state with the updated ledger.
    await this.db
      .insert(diplomacyPairState)
      .values({
        player_id: playerId,
        rival_key: rivalKey,
        commitment_ledger: newLedger,
      })
      .onConflictDoUpdate({
        target: [diplomacyPairState.player_id, diplomacyPairState.rival_key],
        set: {
          commitment_ledger: sql`${JSON.stringify(newLedger)}::jsonb`,
        },
      });

    // 5. Call the accumulator — RAISES credibility (the backed commitment signal).
    // ★ DD-CREDIBILITY: credibility modified ONLY through CredibilityAccumulatorService.
    const credibilityBucket = await this.credibilityAccumulator.recordBackedCommitment(
      playerId,
      rivalKey,
      burnType,
    );

    // 6. Return.
    return { commitmentId, credibilityBucket };
  }

  /**
   * `getCommitmentLedger` — read the commitment_ledger jsonb array.
   * Returns [] if no row exists.
   */
  async getCommitmentLedger(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<unknown[]> {
    const rows = await this.db
      .select({ commitment_ledger: diplomacyPairState.commitment_ledger })
      .from(diplomacyPairState)
      .where(
        and(
          eq(diplomacyPairState.player_id, playerId),
          eq(diplomacyPairState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return [];
    const raw = rows[0]!.commitment_ledger;
    if (!Array.isArray(raw)) return [];
    return raw as unknown[];
  }

  // ── Private helpers ─────────────────────────────────────────────────────────────────────────

  /**
   * Read the current commitment_ledger as a typed array.
   * Returns [] if no row or if the jsonb is not an array.
   */
  private async _readLedger(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<BurnedOptionEntry[]> {
    const rows = await this.db
      .select({ commitment_ledger: diplomacyPairState.commitment_ledger })
      .from(diplomacyPairState)
      .where(
        and(
          eq(diplomacyPairState.player_id, playerId),
          eq(diplomacyPairState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return [];
    const raw = rows[0]!.commitment_ledger;
    if (!Array.isArray(raw)) return [];
    return raw as BurnedOptionEntry[];
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 6 (C6) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §3.3
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4.3 (Potlatch Bind)
//             — Diplomacy & Information Warfare C C6 — 2026-06-26 —
//
// `PotlatchBindService` — §4.3 Potlatch Bind — gift broadcast + reciprocity + standing penalty.
//
// Purpose:
//   The Potlatch Bind is a compulsory gift-giving mechanism (a potlatch):
//   the player broadcasts a costly gift to a rival, compelling them to reciprocate or
//   suffer a standing penalty.  Three operations:
//
//   1. `composeGift` — validate against the Erlang-stash floor (P2 no-free-action) and
//      broadcast the gift by writing a public_ledger_entry row (the ONE P5 exception).
//
//   2. `evaluateReciprocity` — drain the rival's operational reserve via A's `recordPressure`
//      hook (revenue pressure, 'mounting' magnitude [PROV-Y26Q2]).
//
//   3. `applyStandingPenalty` — call credibilityAccumulator.recordRefusedGift (the standing
//      penalty — lowers the credibility band).
//
// Erlang-stash floor (P2 no-free-action):
//   `qty` MUST be >= `diplomacy.potlatch_minimum_gift_qty_cents` (getter-sourced, default 1000).
//   If `qty < minimum`, composeGift returns { rejected: true, reason: 'below_stash_floor' }.
//   This is the P2 no-free-action invariant: gifts below the stash floor are invalid.
//
// P5 exception:
//   composeGift writes a `public_ledger_entry` row with `entry_type='potlatch_gift'`.
//   This is the ONLY P5 exception in the diplomacy module — the row is visible to rivals.
//
// DD-CREDIBILITY:
//   applyStandingPenalty delegates to CredibilityAccumulatorService.recordRefusedGift ONLY.
//   No per-mechanic credibility column.
//
// A's hook:
//   evaluateReciprocity calls RegimeSwitchingService.recordPressure(playerId, rivalKey, 'revenue', 'mounting').
//   This is A's §13 B/C write hook — C NEVER writes rival_state directly.
//
// C4 (determinism): NO Math.random(). NO Date.now().
//   All operations are pure functions of inputs + DB state.
// R2.3: potlatchMinimumGiftQtyCents sourced via getter (never inline).

import { Injectable, Inject } from '@nestjs/common';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { publicLedgerEntry } from '../../../db/schema/conflict_diplomacy';
import type { RivalKey } from '../rival/rival-ai.types';
import { RegimeSwitchingService } from '../rival/regime-switching.service';
import { DiplomacyTunables } from './diplomacy.tunables';
import { CredibilityAccumulatorService } from './credibility-accumulator.service';
import type { GiftType, CredibilityScoreBucket } from './diplomacy.types';

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PotlatchBindService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
    private readonly credibilityAccumulator: CredibilityAccumulatorService,
    private readonly regimeSwitching: RegimeSwitchingService,
  ) {}

  /**
   * `composeGift` — validate and broadcast a Potlatch gift.
   *
   * 1. Validate: qty >= potlatchMinimumGiftQtyCents (getter-sourced, P2 no-free-action).
   *    Returns { rejected: true, reason: 'below_stash_floor' } if qty < minimum.
   * 2. Write a public_ledger_entry row (the P5 exception — visible to rivals).
   *    entry_type='potlatch_gift', target_rival_key=rivalKey.
   * 3. Returns { entryId, rejected: false }.
   *
   * P5 exception: the public_ledger_entry is the ONLY diplomacy row visible to rivals.
   * P2 no-free-action: rejected gifts below the stash floor are not persisted.
   * C4: NO Math.random(), NO Date.now().
   */
  async composeGift(
    playerId: string,
    rivalKey: RivalKey,
    _giftType: GiftType,
    qty: number,
    gameMinute: bigint,
  ): Promise<{ entryId?: string; rejected: boolean; reason?: string }> {
    // 1. Erlang-stash floor validation (getter-sourced — NOT inline scalar).
    const minQty = this.tunables.potlatchMinimumGiftQtyCents;
    if (qty < minQty) {
      return { rejected: true, reason: 'below_stash_floor' };
    }

    // 2. Write the public_ledger_entry (the ONE P5 exception).
    //    entry_type is always 'potlatch_gift' for a gift broadcast.
    const [row] = await this.db
      .insert(publicLedgerEntry)
      .values({
        player_id:        playerId,
        entry_type:       'potlatch_gift',
        target_rival_key: rivalKey,
        gameMinute,
      })
      .returning({ entry_id: publicLedgerEntry.entry_id });

    // 3. Return success with the new entry_id.
    return { entryId: row!.entry_id, rejected: false };
  }

  /**
   * `evaluateReciprocity` — drain the rival's reserve via A's recordPressure hook.
   *
   * Calls RegimeSwitchingService.recordPressure(playerId, rivalKey, 'revenue', 'mounting').
   * This is A's §13 B/C write hook — C NEVER writes rival_state directly.
   *
   * Source: 'revenue' — reciprocity drain depletes operational reserve → revenue impact.
   * Magnitude: 'mounting' [PROV-Y26Q2] — calibration-routed.
   *
   * Returns { pressureApplied: true, source: 'revenue', magnitudeBucket: 'mounting' }.
   * C4: NO Math.random(), NO Date.now().
   */
  async evaluateReciprocity(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ pressureApplied: boolean; source: string; magnitudeBucket: string }> {
    // A's hook: recordPressure — drains the rival's operational reserve (revenue impact).
    // Source='revenue', magnitude='mounting' [PROV-Y26Q2].
    await this.regimeSwitching.recordPressure(playerId, rivalKey, 'revenue', 'mounting');
    return { pressureApplied: true, source: 'revenue', magnitudeBucket: 'mounting' };
  }

  /**
   * `applyStandingPenalty` — lower credibility via recordRefusedGift.
   *
   * Called when the rival refuses the Potlatch gift.
   * Calls credibilityAccumulator.recordRefusedGift (the standing penalty — band DROPS).
   * Returns { credibilityBucket }.
   *
   * DD-CREDIBILITY: credibility written ONLY via the accumulator.
   * C4: NO Math.random(), NO Date.now().
   */
  async applyStandingPenalty(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{ credibilityBucket: CredibilityScoreBucket }> {
    const credibilityBucket = await this.credibilityAccumulator.recordRefusedGift(
      playerId,
      rivalKey,
    );
    return { credibilityBucket };
  }
}

// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C2 ("MasteryAccumulator
//             Service (upsert-first, +1/−2, LEAST(100, GREATEST(0,…)), accrual only while SELF — D3/design
//             §7.3)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §7.3 ("Write
//             path. Upsert row → UPDATE mastery_score SET mastery_score = LEAST(100, GREATEST(0, mastery_
//             score + δ)); crossing detection compares pre/post vs the threshold getter both directions...
//             While DELEGATED/RETIRED: no accrual").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §2 row 1 (`mastery_score`
//             — schema `player_progression_state.ts:49-66`, DORMANT, zero runtime consumers pre-C2).
//             Pattern (upsert-first + row lock + atomic delta, single tx): `money-holding.repository.ts
//             #settleYield` (`SELECT ... FOR UPDATE` inside `db.transaction`, read→compute→write atomic
//             against a concurrent settle on the SAME row) + `political-event.repository.ts#claimGameDay`
//             (the SAME `.for('update')` row-lock idiom). The `oldScore`/`newScore` pair this method
//             returns is what lets the SERVICE layer detect a threshold crossing without a second read
//             (the row lock guarantees `oldScore` is the value immediately BEFORE THIS delta, even under
//             concurrent callers on the SAME row — a 2nd concurrent caller blocks on the lock, then reads
//             the FIRST caller's already-committed value as ITS OWN `oldScore`, so two concurrent +1s
//             serialize into a correct +1→+2 sequence, never a lost update).
//             — P3-F C2 — 2026-07-18
//
// `MasteryScoreRepository` — the ONLY write path onto the pre-existing `mastery_score` table (mig 0002,
// ACTIVATED by this chunk). Owns exactly one method (`applyDelta`) plus a read helper for BO/test probes.
// NO schema change, NO new column/CHECK/migration on this table (C0 seam #1 — this chunk ACTIVATES it).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { masteryScore, type MasteryScoreRow } from '../db/schema/player_progression_state';

/** The result of one `applyDelta` call. `applied=false` means the row exists but `delegation_state !==
 *  'SELF'` (DELEGATED/RETIRED) — the write-path gate (design §7.3): no accrual while the player isn't
 *  executing the category themselves. `oldScore`/`newScore` are identical in that case (a genuine no-op —
 *  never a partial write). */
export interface MasteryDeltaResult {
  readonly applied: boolean;
  readonly oldScore: number;
  readonly newScore: number;
}

@Injectable()
export class MasteryScoreRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Upsert-first (the row may not exist yet — `ON CONFLICT DO NOTHING` against the composite PK, never
   * clobbers an existing row's `delegation_state`/`graduated_at`/`delegated_to_lieutenant_id`), then a
   * `SELECT ... FOR UPDATE` row lock, then the atomic `LEAST(100, GREATEST(0, mastery_score + delta))`
   * UPDATE — all inside ONE transaction. Returns the pre/post score so the caller can detect a threshold
   * crossing without a second round-trip. `delta` is `1` (mastery +1) or `-2` (mastery −2) — the ONLY two
   * values this lot's canon defines (design §13 — mastery deltas are GDD-verbatim mechanics constants, not
   * a tunable).
   */
  async applyDelta(playerId: string, categoryId: number, delta: 1 | -2): Promise<MasteryDeltaResult> {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(masteryScore)
        .values({ player_id: playerId, category_id: categoryId, mastery_score: 0, delegation_state: 'SELF' })
        .onConflictDoNothing({ target: [masteryScore.player_id, masteryScore.category_id] });

      const rows = await tx
        .select({ mastery_score: masteryScore.mastery_score, delegation_state: masteryScore.delegation_state })
        .from(masteryScore)
        .where(and(eq(masteryScore.player_id, playerId), eq(masteryScore.category_id, categoryId)))
        .for('update');
      const row = rows[0]!; // guaranteed to exist — the upsert above ensures it, onConflictDoNothing only skips an existing row.

      if (row.delegation_state !== 'SELF') {
        // The write-path gate (design §7.3): DELEGATED/RETIRED → no accrual (the player isn't executing —
        // the lieutenant's own performance is ch07's story). A genuine no-op — the row is left untouched.
        return { applied: false, oldScore: row.mastery_score, newScore: row.mastery_score };
      }

      const oldScore = row.mastery_score;
      const updated = await tx
        .update(masteryScore)
        .set({ mastery_score: sql`LEAST(100, GREATEST(0, ${masteryScore.mastery_score} + ${delta}))` })
        .where(and(eq(masteryScore.player_id, playerId), eq(masteryScore.category_id, categoryId)))
        .returning({ mastery_score: masteryScore.mastery_score });
      const newScore = updated[0]!.mastery_score;

      return { applied: true, oldScore, newScore };
    });
  }

  /** One (player, category) row, or `null` if never accrued — the BO/test-probe read path. */
  async getRow(playerId: string, categoryId: number): Promise<MasteryScoreRow | null> {
    const rows = await this.db
      .select()
      .from(masteryScore)
      .where(and(eq(masteryScore.player_id, playerId), eq(masteryScore.category_id, categoryId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * P3-F C5 (design §8.2 step 5, REORDERED — see `graduation.service.ts`'s own header for the full
   * concurrency account) — the graduation WINNER GATE. ONE atomic conditional `UPDATE ... WHERE
   * delegation_state = 'SELF' RETURNING mastery_score` — mirrors `structural-decision-governor.
   * repository.ts#reserveStructuralSlot`'s exact idiom (no separate SELECT, no row lock needed: the
   * WHERE's own read and the SET's write happen as ONE atomic statement under Postgres's row-level
   * lock, so two concurrent graduations on the SAME (player, category) row serialize — the second's
   * WHERE re-evaluates against the FIRST's already-committed `delegation_state='DELEGATED'` and matches
   * zero rows). Returns `{flipped:false}` iff the row was already non-SELF (a genuine race loss OR a
   * stale validate — the caller 409s WITHOUT ever calling attachScript, satisfying "no double attach").
   * `masteryAtEvent` is the score at the instant of the flip (the UPDATE does not touch the score
   * column, so the `RETURNING` value is exact — no second read, no TOCTOU on the snapshot itself).
   */
  async flipToDelegated(
    playerId: string,
    categoryId: number,
    lieutenantId: string,
  ): Promise<{ flipped: true; masteryAtEvent: number } | { flipped: false }> {
    const updated = await this.db
      .update(masteryScore)
      .set({ delegation_state: 'DELEGATED', delegated_to_lieutenant_id: lieutenantId, graduated_at: sql`now()` })
      .where(
        and(
          eq(masteryScore.player_id, playerId),
          eq(masteryScore.category_id, categoryId),
          eq(masteryScore.delegation_state, 'SELF'),
        ),
      )
      .returning({ mastery_score: masteryScore.mastery_score });
    if (updated.length === 0) return { flipped: false };
    return { flipped: true, masteryAtEvent: updated[0]!.mastery_score };
  }

  /**
   * P3-F C5 — the `flipToDelegated` COMPENSATION (mirrors the governor's OWN `compensateStructuralSlot`
   * pattern): reverts the row back to `SELF`/NULL-lt/NULL-`graduated_at` when a LATER step of the SAME
   * graduation attempt fails (attach 404 on a corrupted post-validate id; the induced-failure proof —
   * design step ordering divergence documented in `graduation.service.ts`). Scoped by
   * `delegated_to_lieutenant_id = lieutenantId` (never a bare player+category match) so a stale/duplicate
   * compensate can only ever undo the EXACT flip THIS attempt made — never a legitimately-different
   * concurrent graduation that may have landed in the interim. A zero-row match (already reverted, or
   * genuinely no longer ours) is a silent no-op — never a throw (compensation must not itself become a
   * NEW failure mode).
   */
  async revertToSelf(playerId: string, categoryId: number, lieutenantId: string): Promise<void> {
    await this.db
      .update(masteryScore)
      .set({ delegation_state: 'SELF', delegated_to_lieutenant_id: null, graduated_at: null })
      .where(
        and(
          eq(masteryScore.player_id, playerId),
          eq(masteryScore.category_id, categoryId),
          eq(masteryScore.delegation_state, 'DELEGATED'),
          eq(masteryScore.delegated_to_lieutenant_id, lieutenantId),
        ),
      );
  }

  /**
   * P3-F C8 (design §9.1 step 5, REORDERED — decisions §4 #27's own instruction: "the recall's state flip
   * back to SELF is the REVERSE of C5's flip; use the SAME single-statement conditional idiom") — the
   * RECALL WINNER GATE. ONE atomic conditional `UPDATE ... WHERE delegation_state = 'DELEGATED' AND
   * delegated_to_lieutenant_id = :lieutenantId RETURNING mastery_score` — mirrors `flipToDelegated`'s exact
   * idiom, reversed: `SELF` -> `DELEGATED` there, `DELEGATED` -> `SELF` here. `graduated_at` is
   * DELIBERATELY NOT in the SET list (design §9.1 step 5: "graduated_at KEPT — the scar: a recalled
   * category is visibly re-graduatable-with-history") — the column simply never appears on either side of
   * this statement, so it is byte-untouched by construction, never a second write to preserve it. Scoping
   * the WHERE by BOTH `delegation_state='DELEGATED'` AND the CURRENT `delegated_to_lieutenant_id` (read at
   * validate, before this call) makes a second concurrent recall on the SAME category lose at the DB: the
   * first winner's UPDATE already flipped `delegation_state` to `SELF`, so the second statement's WHERE
   * matches zero rows (`flipped:false` — 409, never reaching any post-flip step, the SAME "no double
   * anything" guarantee `flipToDelegated` gives graduation). `masteryAtEvent` is the score AT THE INSTANT
   * of the flip (the UPDATE never touches the score column, so `RETURNING` is exact — no second read).
   */
  async flipToSelfForRecall(
    playerId: string,
    categoryId: number,
    lieutenantId: string,
  ): Promise<{ flipped: true; masteryAtEvent: number } | { flipped: false }> {
    const updated = await this.db
      .update(masteryScore)
      .set({ delegation_state: 'SELF', delegated_to_lieutenant_id: null })
      .where(
        and(
          eq(masteryScore.player_id, playerId),
          eq(masteryScore.category_id, categoryId),
          eq(masteryScore.delegation_state, 'DELEGATED'),
          eq(masteryScore.delegated_to_lieutenant_id, lieutenantId),
        ),
      )
      .returning({ mastery_score: masteryScore.mastery_score });
    if (updated.length === 0) return { flipped: false };
    return { flipped: true, masteryAtEvent: updated[0]!.mastery_score };
  }

  /**
   * P3-F C8 — the `flipToSelfForRecall` COMPENSATION (mirrors `revertToSelf`'s own shape, reversed): a
   * LATER step of the SAME recall attempt fails (the induced-failure proof — a corrupted post-flip
   * lieutenant id 404s on the real ownership lookup) -> restore `delegation_state='DELEGATED'` +
   * `delegated_to_lieutenant_id=lieutenantId`. `graduated_at` is AGAIN not in the SET list: the winner
   * gate never touched it, so there is nothing to restore — the column was byte-untouched throughout the
   * entire failed attempt. Scoped by `delegation_state='SELF'` (the state the winner gate JUST set) so a
   * stale/duplicate compensate can only ever undo the EXACT flip this attempt made — a zero-row match is a
   * silent no-op (compensation must not itself become a new failure mode, the SAME discipline
   * `revertToSelf` documents).
   */
  async revertToDelegatedForRecall(playerId: string, categoryId: number, lieutenantId: string): Promise<void> {
    await this.db
      .update(masteryScore)
      .set({ delegation_state: 'DELEGATED', delegated_to_lieutenant_id: lieutenantId })
      .where(
        and(
          eq(masteryScore.player_id, playerId),
          eq(masteryScore.category_id, categoryId),
          eq(masteryScore.delegation_state, 'SELF'),
        ),
      );
  }
}

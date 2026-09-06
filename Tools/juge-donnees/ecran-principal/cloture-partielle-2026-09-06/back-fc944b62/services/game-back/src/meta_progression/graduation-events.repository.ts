// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C1 (`DelegationRatchetModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in) + C5
//             (`GraduationService.executeGraduation` — the append-only GRADUATION row + successor install).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §3 (`graduation_
//             events` — the append-only audit spine, BOTH directions GRADUATION|RECALL, D13) + §8.2 step 6
//             (GRADUATION INSERT) + §8.4 (successor install) + §9.1 step 8 (RECALL INSERT).
//             -- P3-F C1 -- 2026-07-18 / C5 -- 2026-07-19
//
// `GraduationEventsRepository` — over `graduation_events` (mig 0135). C1 registered the DI scaffold; C5
// adds `recordGraduation` (the append-only INSERT method — D13 applicative discipline, no update/delete
// method is EVER added to this class) + the successor `mastery_score` install, ONE transaction, called by
// `GraduationService.executeGraduation` AFTER `MasteryScoreRepository.flipToDelegated` has already won the
// concurrency race (see that service's own header for the full step-ordering account). C8 adds the RECALL
// counterpart INSERT + the seed-depth `listForPlayer` / double-recall lookup `computeFallbackBucket` needs
// (design §9.1 step 3) against its own REAL call site.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { graduationEvent } from '../db/schema/delegation_ratchet';
import { masteryScore } from '../db/schema/player_progression_state';

/** `recordGraduation` params (design §8.2 step 6 GRADUATION row + §8.4 successor install) — the record
 *  half of the graduation, run AFTER `MasteryScoreRepository.flipToDelegated` won the race (C5 —
 *  `graduation.service.ts`). */
export interface RecordGraduationParams {
  readonly playerId: string;
  readonly categoryId: number;
  readonly lieutenantId: string;
  readonly seedDecisionsN: number;
  readonly scriptSeedHash: string;
  readonly masteryAtEvent: number;
  readonly successorCategoryId: number | null;
  readonly sessionRef: string | null;
  readonly gameTick: number;
}

@Injectable()
export class GraduationEventsRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * P3-F C5 (design §8.2 step 6 + §8.4) — the append-only GRADUATION row + the honest RESERVED-substrate
   * successor install, ONE transaction (both are permanent facts of the SAME committed graduation — no
   * partial state between "the audit row exists" and "the successor is visible"). The successor
   * `mastery_score` upsert is `ON CONFLICT DO NOTHING` (D1 idempotent-lazy-create precedent,
   * `MasteryScoreRepository.applyDelta` — a pre-existing successor row, e.g. from a LATER P3-G..K
   * activation, is never clobbered back to `SELF/0`); skipped entirely when `successorCategoryId` is
   * `null` (a category with no successor — should not occur for a LIVE row per the DD-F2 boot check, but
   * this method stays honest either way).
   */
  async recordGraduation(params: RecordGraduationParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(graduationEvent).values({
        player_id: params.playerId,
        category_id: params.categoryId,
        event_kind: 'GRADUATION',
        lieutenant_id: params.lieutenantId,
        seed_decisions_n: params.seedDecisionsN,
        script_seed_hash: params.scriptSeedHash,
        mastery_at_event: params.masteryAtEvent,
        successor_category_id: params.successorCategoryId,
        session_ref: params.sessionRef,
        game_tick: params.gameTick,
      });

      if (params.successorCategoryId !== null) {
        await tx
          .insert(masteryScore)
          .values({
            player_id: params.playerId,
            category_id: params.successorCategoryId,
            mastery_score: 0,
            delegation_state: 'SELF',
          })
          .onConflictDoNothing({ target: [masteryScore.player_id, masteryScore.category_id] });
      }
    });
  }

  /**
   * P3-F C3 — the player projection's `recall_scar` field (design §11): true iff a `RECALL`-kind
   * `graduation_events` row EVER exists for (player, category) — a permanent flag (append-only spine, D13
   * — never cleared by a later graduation). No writer exists before C5/C8 (`GraduationService`/
   * `PromotionLockService` INSERT the append-only rows), so this honestly returns `false` for every C3
   * fixture; a real read against a real, currently-always-empty table, never a hardcoded literal.
   */
  async hasRecallEvent(playerId: string, categoryId: number): Promise<boolean> {
    const rows = await this.db
      .select({ one: sql<number>`1` })
      .from(graduationEvent)
      .where(
        and(
          eq(graduationEvent.player_id, playerId),
          eq(graduationEvent.category_id, categoryId),
          eq(graduationEvent.event_kind, 'RECALL'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * P3-F C8 (design §9.1 step 8) — the append-only RECALL row (D13's OTHER `event_kind`). Called AFTER
   * `MasteryScoreRepository.flipToSelfForRecall` has already won the recall's own winner gate
   * (`promotion-lock.service.ts`'s own header carries the full step-ordering account, the SAME
   * winner-gate-first shape decisions §4 #27 mandates for THIS site). `reversalCost` is the FULL
   * `ReversalCostComposite` jsonb (severance/accord/realization buckets — BO forensics, R2.2 — never
   * serialized to any player-facing payload). `successorCategoryId` is carried again on the RECALL row
   * (mirrors the GRADUATION row's own field — the successor this recall SUSPENDS, design §9.1 step 7's
   * "suspended successor ref = the successor row installed at graduation").
   */
  async recordRecall(params: {
    readonly playerId: string;
    readonly categoryId: number;
    readonly lieutenantId: string;
    readonly masteryAtEvent: number;
    readonly successorCategoryId: number | null;
    readonly reversalCost: Record<string, unknown>;
    readonly sessionRef: string | null;
    readonly gameTick: number;
  }): Promise<void> {
    await this.db.insert(graduationEvent).values({
      player_id: params.playerId,
      category_id: params.categoryId,
      event_kind: 'RECALL',
      lieutenant_id: params.lieutenantId,
      mastery_at_event: params.masteryAtEvent,
      successor_category_id: params.successorCategoryId,
      reversal_cost: params.reversalCost,
      session_ref: params.sessionRef,
      game_tick: params.gameTick,
    });
  }

  // P3-F C8 (design §9.1 step 3 / decisions §4 #28 — "double-recall derived ONLY from `graduation_events`
  // ... NEVER from `player_proficiency` counters") — `computeFallbackBucket`'s MINIMAL-branch input REUSES
  // `hasRecallEvent` above verbatim (called strictly BEFORE `recordRecall` inserts THIS recall's own row,
  // so a first-ever recall correctly reads false and a second+ recall on a re-graduated category correctly
  // reads true from the PRIOR cycle's row — `promotion-lock.service.ts` is the call site).
}

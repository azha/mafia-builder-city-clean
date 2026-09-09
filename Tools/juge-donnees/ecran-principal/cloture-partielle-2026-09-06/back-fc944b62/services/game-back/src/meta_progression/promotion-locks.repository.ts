// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C1 (`DelegationRatchetModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §3 (`promotion_
//             locks` — ONE ROW PER RECALL, canon INACTIVE = no row, D10) + §9 (Promotion Lock pipeline).
//             -- P3-F C1 -- 2026-07-18
//
// `PromotionLocksRepository` — DI-ready scaffold over `promotion_locks` (mig 0135). C1 registers this
// class in `DelegationRatchetModule`'s providers/exports so C8 (`PromotionLockService.requestRecall` +
// the `PROMOTION_LOCK_TICK` HOURLY batch-close) can inject it. No method is added here yet — the ACTIVE-
// lock lookup (design §8.2 step 1 "no promotion_locks row ACTIVE for the category"), the INSERT (§9.1
// step 7), and the set-based batch-close (§9.2, targeting the `promotion_locks_window_state_end_idx`
// index) all land with C8, the first real caller.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lte, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { promotionLock, type PromotionLockRow } from '../db/schema/delegation_ratchet';

@Injectable()
export class PromotionLocksRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * P3-F C3 — the player projection's `fallback_quality_bucket` field (design §11): the ACTIVE
   * `promotion_locks` row for (player, category), or `null` if none (no writer exists before C8 —
   * `PromotionLockService.requestRecall` — so this honestly returns `null` for every C3 fixture; a real
   * read against a real, currently-always-empty table, never a hardcoded default). C8 REUSES this SAME
   * method for its own "no promotion_locks row ACTIVE for the category" validate-step lookup (design §8.2
   * step 1) instead of adding a second, drift-risking query.
   */
  async findActiveForCategory(playerId: string, categoryId: number): Promise<PromotionLockRow | null> {
    const rows = await this.db
      .select()
      .from(promotionLock)
      .where(
        and(
          eq(promotionLock.player_id, playerId),
          eq(promotionLock.category_id, categoryId),
          eq(promotionLock.unmanaged_window_state, 'ACTIVE'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * P3-F C3 — the player projection's `successor.suspended` field (design §11/§9's "successor SUSPENDED
   * overlay for the window"): true iff an ACTIVE `promotion_locks` row exists ANYWHERE for this player
   * whose `suspended_higher_order_category_id` equals the successor category being projected. `mastery_
   * score.category_id` for a nested/higher-order successor can only ever be an ACTIVE-locked row once a
   * successor domain itself goes LIVE and gets delegated (P3-G..K — every `successorCode` in the catalogue
   * is RESERVED today, design §15), so this honestly evaluates `false` for the entire P3-F lot — a real
   * read against a real, structurally-always-empty condition today, never a hardcoded literal (mirrors the
   * codebase's own `accord_degradation_applied=false` honest-inert convention).
   */
  async hasActiveSuspensionForCategory(playerId: string, successorCategoryId: number): Promise<boolean> {
    const rows = await this.db
      .select({ lock_id: promotionLock.lock_id })
      .from(promotionLock)
      .where(
        and(
          eq(promotionLock.player_id, playerId),
          eq(promotionLock.suspended_higher_order_category_id, successorCategoryId),
          eq(promotionLock.unmanaged_window_state, 'ACTIVE'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * P3-F C9 (design §10.4, D11) — the `DegradedCategoryPressureProducer`'s OWN eligibility read: EVERY
   * ACTIVE `promotion_locks` row for this player (unscoped by category — unlike `findActiveForCategory`
   * above), category_id ascending (deterministic — mirrors `PlayerProficiencyRepository.
   * listRecoveringForPlayer`'s own ordering, so the producer's category loop iterates both sources in the
   * SAME order). Additive, no existing method touched (R7/C0-reanchor §6).
   */
  async listActiveForPlayer(playerId: string): Promise<PromotionLockRow[]> {
    return this.db
      .select()
      .from(promotionLock)
      .where(and(eq(promotionLock.player_id, playerId), eq(promotionLock.unmanaged_window_state, 'ACTIVE')))
      .orderBy(promotionLock.category_id);
  }

  /**
   * P3-F C8 (design §9.1 step 7) — the ACTIVE lock INSERT. Called AFTER the recall's OWN winner gate
   * (`MasteryScoreRepository.flipToSelfForRecall`) has already won — this row is the durable record of an
   * unmanaged window (canon `INACTIVE` = no row at all, divergence #4). `suspendedHigherOrderCategoryId` =
   * the successor code installed at the ORIGINAL graduation (design step 7's own "suspended successor ref
   * = the successor row installed at graduation") — `MetaProgressionProjectionService.
   * hasActiveSuspensionForCategory` reads this back for the successor-SUSPENDED overlay. Returns the new
   * `lock_id` (the RECALL `graduation_events` row does not carry a lock FK — the append-only row is
   * self-contained by design, D13 — but the caller's own log line/response can reference it).
   */
  async insertRecall(params: {
    readonly playerId: string;
    readonly categoryId: number;
    readonly recalledLtId: string;
    readonly windowStartTick: number;
    readonly windowEndTick: number;
    readonly suspendedHigherOrderCategoryId: number | null;
    readonly fallbackQualityBucket: string;
    readonly reversalCost: Record<string, unknown>;
    readonly accordDegradationApplied: boolean;
  }): Promise<string> {
    const rows = await this.db
      .insert(promotionLock)
      .values({
        player_id: params.playerId,
        category_id: params.categoryId,
        recalled_lt_id: params.recalledLtId,
        unmanaged_window_state: 'ACTIVE',
        window_start_tick: params.windowStartTick,
        window_end_tick: params.windowEndTick,
        suspended_higher_order_category_id: params.suspendedHigherOrderCategoryId,
        fallback_quality_bucket: params.fallbackQualityBucket,
        reversal_cost: params.reversalCost,
        accord_degradation_applied: params.accordDegradationApplied,
      })
      .returning({ lock_id: promotionLock.lock_id });
    return rows[0]!.lock_id;
  }

  /**
   * P3-F C8 (design §9.1 step 1 / D12) — "any `promotion_locks` row (ACTIVE or CLOSED)" for a category:
   * the re-delegation ×3 severance-escalation input (`severance-bucket.ts#escalateSeveranceBucket`,
   * `promotion-lock.service.ts` — BOTH the real recall's own severance computation AND the recall-preview
   * read use this SAME method, never a second implementation). Deliberately UNSCOPED by
   * `unmanaged_window_state` (unlike `findActiveForCategory` above) — a CLOSED window from a prior cycle
   * still counts as "a prior recall happened here" for the escalation, per D12's own literal wording.
   */
  async hasAnyLockForCategory(playerId: string, categoryId: number): Promise<boolean> {
    const rows = await this.db
      .select({ lock_id: promotionLock.lock_id })
      .from(promotionLock)
      .where(and(eq(promotionLock.player_id, playerId), eq(promotionLock.category_id, categoryId)))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * P3-F C8 (design §4/§9.2/D10) — the `PROMOTION_LOCK_TICK` HOURLY batch-close: ONE set-based atomic
   * `UPDATE ... WHERE unmanaged_window_state = 'ACTIVE' AND window_end_tick <= :nowTick RETURNING`, scoped
   * to `playerId` (the scheduler invokes each registered system per-player, `CitySimTickContext.playerId`
   * — mirrors `CompressionQuietDecayTickService`'s own per-player tick shape). Idempotent BY CONSTRUCTION
   * (design §4: "closing an already-CLOSED row is a zero-write; the WHERE clause is the idempotency") — a
   * re-run at the SAME or a LATER `nowTick` matches zero rows the second time (the WHERE's own
   * `unmanaged_window_state = 'ACTIVE'` no longer holds once this call has already flipped a row to
   * CLOSED). Returns the categories that ACTUALLY closed this call (empty array on a genuine no-op — the
   * organic "no active windows" steady state, design §4) — the caller emits ONE
   * `UnmanagedWindowClosedEvent` per returned row.
   */
  async closeExpiredWindows(playerId: string, nowTick: number): Promise<ReadonlyArray<{ categoryId: number; lockId: string }>> {
    const rows = await this.db
      .update(promotionLock)
      .set({ unmanaged_window_state: 'CLOSED', closed_at: sql`now()` })
      .where(
        and(
          eq(promotionLock.player_id, playerId),
          eq(promotionLock.unmanaged_window_state, 'ACTIVE'),
          lte(promotionLock.window_end_tick, nowTick),
        ),
      )
      .returning({ lock_id: promotionLock.lock_id, category_id: promotionLock.category_id });
    return rows.map((r) => ({ categoryId: r.category_id, lockId: r.lock_id }));
  }

  /**
   * P3-F C10 (design §12 `POST /v1/admin/meta/force-close-window`) — the GM force-close winner gate. ONE
   * atomic conditional `UPDATE ... WHERE lock_id=:lockId AND unmanaged_window_state='ACTIVE' RETURNING` —
   * deliberately NOT a call into `closeExpiredWindows` (that method is player+time scoped, ignores the
   * `window_end_tick` deadline entirely — a "force" close is BY DEFINITION allowed to close a window that
   * has not yet naturally expired). This is instead the SAME "single atomic UPDATE guarded by `unmanaged_
   * window_state='ACTIVE'` in its own WHERE, RETURNING the row it actually touched" IDIOM as
   * `closeExpiredWindows` above, keyed by `lock_id` instead of `(player_id, window_end_tick<=nowTick)`.
   * That shared idiom is what makes this SAFE to race against the HOURLY `PROMOTION_LOCK_TICK` on the SAME
   * row: Postgres serializes the two concurrent `UPDATE`s at the row level — whichever statement's WHERE
   * evaluates first wins and flips the row to `CLOSED`; the second statement's WHERE then re-evaluates
   * against the ALREADY-`CLOSED` row and matches zero rows (`null` here, `closed:[]` there) — exactly ONE
   * winner, by construction, never by app-level coordination. Returns `null` on a zero-row match (already
   * CLOSED — a genuine race loss, or a stale double-submit) — the caller reports 409, never a throw.
   */
  async forceCloseLock(lockId: string): Promise<{ playerId: string; categoryId: number; lockId: string } | null> {
    const updated = await this.db
      .update(promotionLock)
      .set({ unmanaged_window_state: 'CLOSED', closed_at: sql`now()` })
      .where(and(eq(promotionLock.lock_id, lockId), eq(promotionLock.unmanaged_window_state, 'ACTIVE')))
      .returning({ lock_id: promotionLock.lock_id, category_id: promotionLock.category_id, player_id: promotionLock.player_id });
    if (updated.length === 0) return null;
    const row = updated[0]!;
    return { playerId: row.player_id, categoryId: row.category_id, lockId: row.lock_id };
  }
}
